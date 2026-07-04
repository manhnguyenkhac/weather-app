using System.Globalization;
using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using WeatherApp.Api.Models;

namespace WeatherApp.Api.Services;

/// <summary>
/// Typed client gọi Open-Meteo. URL đọc từ appsettings.json (section OpenMeteo, đã validate lúc boot).
/// Chống lỗi upstream 2 lớp (#61):
/// - Retry có backoff cho lỗi transient (timeout, network, 5xx/429) — 4xx không retry.
/// - Serve-stale: cache entry kèm FetchedAt, giữ tới stale horizon; hết TTL tươi mà upstream
///   chết (sau retry) thì trả bản cũ với IsStale=true thay vì fail. Chỉ khi không còn bản cũ
///   nào mới trả Data=null — endpoint map thành 502.
/// </summary>
public class OpenMeteoClient(
    HttpClient http,
    IConfiguration config,
    IMemoryCache cache,
    TimeProvider? time = null,
    IReadOnlyList<TimeSpan>? retryDelays = null)
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

    private static readonly TimeSpan[] DefaultRetryDelays =
        [TimeSpan.FromMilliseconds(250), TimeSpan.FromMilliseconds(750)];

    private readonly TimeProvider clock = time ?? TimeProvider.System;
    private readonly IReadOnlyList<TimeSpan> delays = retryDelays ?? DefaultRetryDelays;

    // Entry cache giữ nguyên thời điểm fetch — độ tươi tính trong code (không dựa expiry của
    // MemoryCache) để kiểm soát được bằng TimeProvider trong test
    private sealed record Entry<T>(T Data, DateTimeOffset FetchedAt);

    public Task<UpstreamResult<OpenMeteoGeocodeResponse>> SearchLocationsAsync(string query, int count, CancellationToken ct = default)
    {
        var url = string.Create(CultureInfo.InvariantCulture,
            $"{config["OpenMeteo:GeocodingUrl"]}?name={Uri.EscapeDataString(query)}&count={count}&language=en&format=json");

        return GetJsonCachedAsync<OpenMeteoGeocodeResponse>(url, GeocodeFreshTtl, GeocodeStaleTtl, ct);
    }

    public Task<UpstreamResult<OpenMeteoForecastResponseDto>> GetForecastAsync(double lat, double lon, int days, CancellationToken ct = default)
    {
        // InvariantCulture bắt buộc: lat/lon là double, culture vi-VN sẽ sinh dấu phẩy thập phân làm hỏng URL
        // hourly KHÔNG giới hạn forecast_hours: trả 24×days entries để UI xem hourly của từng ngày
        var url = string.Create(CultureInfo.InvariantCulture,
            $"{config["OpenMeteo:ForecastUrl"]}?latitude={lat}&longitude={lon}" +
            $"&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code" +
            $"&hourly=temperature_2m,weather_code" +
            $"&daily=temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max" +
            $"&forecast_days={days}&timezone=auto");

        return GetJsonCachedAsync<OpenMeteoForecastResponseDto>(url, ForecastFreshTtl, ForecastStaleTtl, ct);
    }

    public Task<UpstreamResult<OpenMeteoAirQualityResponseDto>> GetAirQualityAsync(double lat, double lon, CancellationToken ct = default)
    {
        // InvariantCulture bắt buộc: lat/lon là double, culture vi-VN sẽ sinh dấu phẩy thập phân làm hỏng URL
        var url = string.Create(CultureInfo.InvariantCulture,
            $"{config["OpenMeteo:AirQualityUrl"]}?latitude={lat}&longitude={lon}" +
            $"&current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide" +
            $"&hourly=us_aqi&forecast_hours=24&timezone=auto");

        return GetJsonCachedAsync<OpenMeteoAirQualityResponseDto>(url, AirQualityFreshTtl, AirQualityStaleTtl, ct);
    }

    public Task<UpstreamResult<OpenMeteoArchiveResponseDto>> GetHistoryAsync(double lat, double lon, CancellationToken ct = default)
    {
        // 10 năm dữ liệu ngày cho MỘT lời gọi: vừa vẽ 30 ngày gần nhất, vừa tính trung bình 10 năm
        // cùng thời điểm. Archive trễ vài ngày — end = hôm qua, phần tử null bị endpoint bỏ qua.
        var today = clock.GetUtcNow().UtcDateTime.Date;
        var start = today.AddYears(-10).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        var end = today.AddDays(-1).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

        // InvariantCulture bắt buộc: lat/lon là double, culture vi-VN sẽ sinh dấu phẩy thập phân làm hỏng URL
        var url = string.Create(CultureInfo.InvariantCulture,
            $"{config["OpenMeteo:ArchiveUrl"]}?latitude={lat}&longitude={lon}" +
            $"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum" +
            $"&start_date={start}&end_date={end}&timezone=auto");

        return GetJsonCachedAsync<OpenMeteoArchiveResponseDto>(url, HistoryFreshTtl, HistoryStaleTtl, ct);
    }

    private async Task<UpstreamResult<T>> GetJsonCachedAsync<T>(string url, TimeSpan freshTtl, TimeSpan staleTtl, CancellationToken ct) where T : class
    {
        var now = clock.GetUtcNow();
        cache.TryGetValue(url, out Entry<T>? entry);

        if (entry is not null && now - entry.FetchedAt < freshTtl)
        {
            return UpstreamResult<T>.Fresh(entry.Data);
        }

        var fetched = await GetJsonWithRetryAsync<T>(url, ct);
        if (fetched is not null)
        {
            cache.Set(url, new Entry<T>(fetched, now), staleTtl);
            return UpstreamResult<T>.Fresh(fetched);
        }

        // Upstream chết sau retry — còn bản cũ trong stale horizon thì dùng đỡ (check tuổi bằng
        // TimeProvider của mình, không tin expiry của MemoryCache)
        if (entry is not null && now - entry.FetchedAt <= staleTtl)
        {
            return UpstreamResult<T>.Stale(entry.Data);
        }

        return UpstreamResult<T>.Failed();
    }

    // Retry chỉ cho lỗi transient; lỗi vĩnh viễn (4xx, body rác) thì thử lại vô ích — fail ngay
    private async Task<T?> GetJsonWithRetryAsync<T>(string url, CancellationToken ct) where T : class
    {
        for (var attempt = 0; ; attempt++)
        {
            var (data, transient) = await GetJsonOrNullAsync<T>(url, ct);
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
    private async Task<(T? Data, bool Transient)> GetJsonOrNullAsync<T>(string url, CancellationToken ct) where T : class
    {
        try
        {
            using var resp = await http.GetAsync(url, ct);
            if (!resp.IsSuccessStatusCode)
            {
                // 5xx/429/408 là sự cố tạm thời phía upstream; 4xx còn lại là request sai — không retry
                var transient = (int)resp.StatusCode >= 500
                    || resp.StatusCode is HttpStatusCode.TooManyRequests or HttpStatusCode.RequestTimeout;
                return (null, transient);
            }

            return (await resp.Content.ReadFromJsonAsync<T>(ct), false);
        }
        catch (HttpRequestException)
        {
            return (null, true);
        }
        catch (JsonException)
        {
            return (null, false);
        }
        catch (NotSupportedException)
        {
            // 200 nhưng Content-Type không phải JSON (vd trang lỗi HTML từ proxy/CDN)
            return (null, false);
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            // Timeout của HttpClient (không phải client hủy request) cũng là upstream lỗi
            return (null, true);
        }
    }
}
