using System.Globalization;
using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using WeatherApp.Api.Models;

namespace WeatherApp.Api.Services;

/// <summary>
/// Typed client gọi Open-Meteo. URL đọc từ appsettings.json (section OpenMeteo, đã validate lúc boot).
/// Chống lỗi upstream nhiều lớp (#61, #74):
/// - Retry có backoff cho lỗi transient (timeout, network, 5xx) — 4xx và 429 không retry
///   (429 = rate-limit theo phút/giờ, đập thêm trong 1s chỉ làm quota xấu hơn).
/// - Serve-stale: cache entry kèm FetchedAt, giữ tới stale horizon; hết TTL tươi mà upstream
///   chết (sau retry) thì trả bản cũ với IsStale=true. Cache key ỔN ĐỊNH tách khỏi URL
///   (URL /history chứa ngày, đổi lúc 00:00 UTC — key không được xoay theo).
/// - Single-flight per key: N request cùng miss chỉ 1 lời gọi upstream, số còn lại chờ kết quả
///   (chống stampede lúc cold start — hành vi từng khiến IP bị Open-Meteo chặn).
/// - Tọa độ làm tròn 2 số lẻ (~1.1km, nhỏ hơn grid ~11km của Open-Meteo): chặn cache phình
///   theo biến thể tọa độ vô hạn + tăng hit-rate.
/// </summary>
public class OpenMeteoClient(
    HttpClient http,
    IConfiguration config,
    IMemoryCache cache,
    TimeProvider? time = null,
    IReadOnlyList<TimeSpan>? retryDelays = null,
    ILogger<OpenMeteoClient>? logger = null)
{
    // Tọa độ city gần như bất biến — tươi lâu, stale rất lâu; forecast/AQI đổi theo giờ — tươi ngắn,
    // stale đủ dài để sống qua một đợt upstream chặn IP (như vụ 502 production 2026-07-04)
    private static readonly TimeSpan GeocodeFreshTtl = TimeSpan.FromHours(1);
    private static readonly TimeSpan GeocodeStaleTtl = TimeSpan.FromHours(24);
    private static readonly TimeSpan ForecastFreshTtl = TimeSpan.FromMinutes(10);
    private static readonly TimeSpan ForecastStaleTtl = TimeSpan.FromHours(6);
    private static readonly TimeSpan AirQualityFreshTtl = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan AirQualityStaleTtl = TimeSpan.FromHours(6);
    // Archive chỉ nhích thêm 1 ngày dữ liệu mỗi ngày — tươi lâu, stale rất lâu
    private static readonly TimeSpan HistoryFreshTtl = TimeSpan.FromHours(12);
    private static readonly TimeSpan HistoryStaleTtl = TimeSpan.FromHours(48);

    // Trọng số size cho MemoryCache SizeLimit (Program.cs): history 10 năm daily nặng nhất
    private const int GeocodeSize = 1;
    private const int ForecastSize = 10;
    private const int AirQualitySize = 5;
    private const int HistorySize = 100;

    private static readonly TimeSpan[] DefaultRetryDelays =
        [TimeSpan.FromMilliseconds(250), TimeSpan.FromMilliseconds(750)];

    // Single-flight bằng striped-lock: mảng cố định semaphore, chia key theo hash.
    // KHÔNG dùng dictionary per-key (geocode key chứa query tùy ý → phình vô hạn, không trần).
    // Đánh đổi: 2 key khác nhau có thể chung 1 gate — hiếm, chỉ chờ thêm chút, không sai kết quả.
    private const int GateCount = 64;
    private static readonly SemaphoreSlim[] Gates = CreateGates();

    private static SemaphoreSlim[] CreateGates()
    {
        var gates = new SemaphoreSlim[GateCount];
        for (var i = 0; i < GateCount; i++)
        {
            gates[i] = new SemaphoreSlim(1, 1);
        }
        return gates;
    }

    // string.GetHashCode ổn định trong một tiến trình (đủ cho gate in-memory); &MaxValue tránh âm
    private static SemaphoreSlim GateFor(string key) =>
        Gates[(key.GetHashCode() & int.MaxValue) % GateCount];

    private readonly TimeProvider clock = time ?? TimeProvider.System;
    private readonly IReadOnlyList<TimeSpan> delays = retryDelays ?? DefaultRetryDelays;
    private readonly ILogger<OpenMeteoClient> log = logger ?? NullLogger<OpenMeteoClient>.Instance;

    // Entry cache giữ nguyên thời điểm fetch — độ tươi tính trong code (không dựa expiry của
    // MemoryCache) để kiểm soát được bằng TimeProvider trong test
    private sealed record Entry<T>(T Data, DateTimeOffset FetchedAt);

    public Task<UpstreamResult<OpenMeteoGeocodeResponse>> SearchLocationsAsync(string query, int count, CancellationToken ct = default)
    {
        var url = string.Create(CultureInfo.InvariantCulture,
            $"{config["OpenMeteo:GeocodingUrl"]}?name={Uri.EscapeDataString(query)}&count={count}&language=en&format=json");

        return GetJsonCachedAsync<OpenMeteoGeocodeResponse>("geocode", url, url, GeocodeFreshTtl, GeocodeStaleTtl, GeocodeSize, ct);
    }

    public Task<UpstreamResult<OpenMeteoForecastResponseDto>> GetForecastAsync(double lat, double lon, int days, CancellationToken ct = default)
    {
        (lat, lon) = RoundCoords(lat, lon);

        // InvariantCulture bắt buộc: lat/lon là double, culture vi-VN sẽ sinh dấu phẩy thập phân làm hỏng URL
        // hourly KHÔNG giới hạn forecast_hours: trả 24×days entries để UI xem hourly của từng ngày
        var url = string.Create(CultureInfo.InvariantCulture,
            $"{config["OpenMeteo:ForecastUrl"]}?latitude={lat}&longitude={lon}" +
            $"&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code" +
            $"&hourly=temperature_2m,weather_code" +
            $"&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max" +
            $"&forecast_days={days}&timezone=auto");

        return GetJsonCachedAsync<OpenMeteoForecastResponseDto>("forecast", url, url, ForecastFreshTtl, ForecastStaleTtl, ForecastSize, ct);
    }

    public Task<UpstreamResult<OpenMeteoAirQualityResponseDto>> GetAirQualityAsync(double lat, double lon, CancellationToken ct = default)
    {
        (lat, lon) = RoundCoords(lat, lon);

        // InvariantCulture bắt buộc: lat/lon là double, culture vi-VN sẽ sinh dấu phẩy thập phân làm hỏng URL
        var url = string.Create(CultureInfo.InvariantCulture,
            $"{config["OpenMeteo:AirQualityUrl"]}?latitude={lat}&longitude={lon}" +
            $"&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide" +
            $"&hourly=us_aqi&forecast_hours=24&timezone=auto");

        return GetJsonCachedAsync<OpenMeteoAirQualityResponseDto>("air-quality", url, url, AirQualityFreshTtl, AirQualityStaleTtl, AirQualitySize, ct);
    }

    public Task<UpstreamResult<OpenMeteoArchiveResponseDto>> GetHistoryAsync(double lat, double lon, CancellationToken ct = default)
    {
        (lat, lon) = RoundCoords(lat, lon);

        // 10 năm dữ liệu ngày cho MỘT lời gọi: vừa vẽ 30 ngày gần nhất, vừa tính trung bình 10 năm
        // cùng thời điểm. Archive trễ vài ngày — end = hôm qua, phần tử null bị endpoint bỏ qua.
        var today = clock.GetUtcNow().UtcDateTime.Date;
        var start = today.AddYears(-10).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var end = today.AddDays(-1).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

        var url = string.Create(CultureInfo.InvariantCulture,
            $"{config["OpenMeteo:ArchiveUrl"]}?latitude={lat}&longitude={lon}" +
            $"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum" +
            $"&start_date={start}&end_date={end}&timezone=auto");

        // Cache key KHÔNG chứa ngày — nếu key = URL thì 00:00 UTC key đổi, serve-stale vô hiệu
        // đúng lúc upstream hay chết (bài học vụ 502 production)
        var cacheKey = string.Create(CultureInfo.InvariantCulture, $"history:{lat}:{lon}");

        return GetJsonCachedAsync<OpenMeteoArchiveResponseDto>("history", url, cacheKey, HistoryFreshTtl, HistoryStaleTtl, HistorySize, ct);
    }

    /// <summary>~1.1km — đủ mịn cho thời tiết (grid Open-Meteo ~11km), chặn cache phình theo tọa độ thô.</summary>
    private static (double Lat, double Lon) RoundCoords(double lat, double lon) =>
        (Math.Round(lat, 2), Math.Round(lon, 2));

    private async Task<UpstreamResult<T>> GetJsonCachedAsync<T>(string kind, string url, string cacheKey, TimeSpan freshTtl, TimeSpan staleTtl, int size, CancellationToken ct) where T : class
    {
        if (TryGetFresh<T>(cacheKey, freshTtl, out var fresh))
        {
            // Cache hit là đường êm — Debug để không nhiễu log prod (mặc định Information)
            log.LogDebug("Open-Meteo {Kind}: cache hit (fresh)", kind);
            return UpstreamResult<T>.Fresh(fresh!);
        }

        // Single-flight: request sau chờ request đầu fetch xong rồi đọc lại cache
        var gate = GateFor(cacheKey);
        await gate.WaitAsync(ct);
        try
        {
            // Double-check: người giữ gate trước mình có thể vừa refresh xong
            if (TryGetFresh<T>(cacheKey, freshTtl, out var refreshed))
            {
                log.LogDebug("Open-Meteo {Kind}: cache hit (fresh, sau single-flight)", kind);
                return UpstreamResult<T>.Fresh(refreshed!);
            }

            var fetched = await GetJsonWithRetryAsync<T>(kind, url, ct);
            if (fetched is not null)
            {
                // FetchedAt lấy SAU khi fetch — request chậm không ăn mòn TTL tươi của entry
                var entryOptions = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = staleTtl,
                    Size = size,
                };
                cache.Set(cacheKey, new Entry<T>(fetched, clock.GetUtcNow()), entryOptions);
                return UpstreamResult<T>.Fresh(fetched);
            }

            // Upstream chết sau retry — còn bản cũ trong stale horizon thì dùng đỡ (check tuổi bằng
            // TimeProvider của mình, không tin expiry của MemoryCache)
            if (cache.TryGetValue(cacheKey, out Entry<T>? stale) && stale is not null
                && clock.GetUtcNow() - stale.FetchedAt <= staleTtl)
            {
                var ageSec = (long)(clock.GetUtcNow() - stale.FetchedAt).TotalSeconds;
                // Serve-stale = upstream đang chết nhưng còn cache đỡ — dấu hiệu cần để ý
                log.LogWarning("Open-Meteo {Kind}: SERVE-STALE (upstream lỗi, dùng cache cũ {AgeSec}s)", kind, ageSec);
                return UpstreamResult<T>.Stale(stale.Data);
            }

            // Không data, không cache cũ → endpoint trả 502
            log.LogWarning("Open-Meteo {Kind}: FAILED — không có data và không còn cache stale (endpoint trả 502)", kind);
            return UpstreamResult<T>.Failed();
        }
        finally
        {
            gate.Release();
        }
    }

    private bool TryGetFresh<T>(string cacheKey, TimeSpan freshTtl, out T? data) where T : class
    {
        if (cache.TryGetValue(cacheKey, out Entry<T>? entry) && entry is not null
            && clock.GetUtcNow() - entry.FetchedAt < freshTtl)
        {
            data = entry.Data;
            return true;
        }

        data = null;
        return false;
    }

    // Retry chỉ cho lỗi transient; lỗi vĩnh viễn (4xx, 429, body rác) thì thử lại vô ích — fail ngay
    private async Task<T?> GetJsonWithRetryAsync<T>(string kind, string url, CancellationToken ct) where T : class
    {
        for (var attempt = 0; ; attempt++)
        {
            var (data, transient) = await GetJsonOrNullAsync<T>(kind, attempt, url, ct);
            if (data is not null)
            {
                return data;
            }

            if (!transient || attempt >= delays.Count)
            {
                return null;
            }

            await Task.Delay(delays[attempt], ct);
        }
    }

    // Chính sách chung "upstream lỗi => null" cho MỌI lời gọi Open-Meteo (geocode, forecast...):
    // non-2xx, timeout, body không phải JSON hoặc Content-Type lạ đều là upstream lỗi — một nguồn duy nhất.
    // Cờ transient quyết định có đáng retry không.
    private async Task<(T? Data, bool Transient)> GetJsonOrNullAsync<T>(string kind, int attempt, string url, CancellationToken ct) where T : class
    {
        // Đo latency bằng TimeProvider — thấy được Open-Meteo đang nhanh/chậm cỡ nào trong log
        var startedAt = clock.GetTimestamp();
        try
        {
            using var resp = await http.GetAsync(url, ct);
            var ms = (long)clock.GetElapsedTime(startedAt).TotalMilliseconds;
            if (!resp.IsSuccessStatusCode)
            {
                // 5xx/408 là sự cố thoáng qua đáng retry. 429 KHÔNG retry: rate-limit tính theo
                // phút/giờ, 3 hit trong 1s không thể thành công — đi thẳng nhánh serve-stale.
                var transient = (int)resp.StatusCode >= 500 || resp.StatusCode is HttpStatusCode.RequestTimeout;
                log.LogWarning("Open-Meteo {Kind}: HTTP {Status} trong {Ms}ms (attempt {Attempt}, transient={Transient})",
                    kind, (int)resp.StatusCode, ms, attempt, transient);
                return (null, transient);
            }

            var data = await resp.Content.ReadFromJsonAsync<T>(ct);
            // Thành công = lời gọi THẬT tới Open-Meteo (không phải cache) — Information để theo dõi
            // traffic upstream + latency, đúng thứ cần khi IP bị chặn/chậm
            log.LogInformation("Open-Meteo {Kind}: 200 trong {Ms}ms (attempt {Attempt})", kind, ms, attempt);
            return (data, false);
        }
        catch (HttpRequestException ex)
        {
            var ms = (long)clock.GetElapsedTime(startedAt).TotalMilliseconds;
            log.LogWarning("Open-Meteo {Kind}: lỗi mạng trong {Ms}ms (attempt {Attempt}) — {Message}", kind, ms, attempt, ex.Message);
            return (null, true);
        }
        catch (JsonException ex)
        {
            log.LogWarning("Open-Meteo {Kind}: body không parse được JSON (attempt {Attempt}) — {Message}", kind, attempt, ex.Message);
            return (null, false);
        }
        catch (NotSupportedException)
        {
            // 200 nhưng Content-Type không phải JSON (vd trang lỗi HTML từ proxy/CDN)
            log.LogWarning("Open-Meteo {Kind}: 200 nhưng Content-Type không phải JSON (attempt {Attempt})", kind, attempt);
            return (null, false);
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            // Timeout của HttpClient (không phải client hủy request) cũng là upstream lỗi
            var ms = (long)clock.GetElapsedTime(startedAt).TotalMilliseconds;
            log.LogWarning("Open-Meteo {Kind}: TIMEOUT sau {Ms}ms (attempt {Attempt})", kind, ms, attempt);
            return (null, true);
        }
    }
}
