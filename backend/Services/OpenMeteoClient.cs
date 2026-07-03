using System.Globalization;
using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using WeatherApp.Api.Models;

namespace WeatherApp.Api.Services;

/// <summary>
/// Typed client gọi Open-Meteo. URL đọc từ appsettings.json (section OpenMeteo, đã validate lúc boot).
/// Trả null khi upstream lỗi (non-2xx, timeout, body không parse được) — endpoint map thành 502.
/// Response thành công được cache in-memory theo key = URL upstream (chứa đủ mọi query param).
/// </summary>
public class OpenMeteoClient(HttpClient http, IConfiguration config, IMemoryCache cache)
{
    // Tọa độ city gần như bất biến — cache dài; forecast đổi theo giờ — cache ngắn
    private static readonly TimeSpan GeocodeTtl = TimeSpan.FromHours(1);
    private static readonly TimeSpan ForecastTtl = TimeSpan.FromMinutes(10);

    public Task<OpenMeteoGeocodeResponse?> SearchLocationsAsync(string query, int count, CancellationToken ct = default)
    {
        var url = string.Create(CultureInfo.InvariantCulture,
            $"{config["OpenMeteo:GeocodingUrl"]}?name={Uri.EscapeDataString(query)}&count={count}&language=en&format=json");

        return GetJsonCachedAsync<OpenMeteoGeocodeResponse>(url, GeocodeTtl, ct);
    }

    public Task<OpenMeteoForecastResponseDto?> GetForecastAsync(double lat, double lon, int days, CancellationToken ct = default)
    {
        // InvariantCulture bắt buộc: lat/lon là double, culture vi-VN sẽ sinh dấu phẩy thập phân làm hỏng URL
        var url = string.Create(CultureInfo.InvariantCulture,
            $"{config["OpenMeteo:ForecastUrl"]}?latitude={lat}&longitude={lon}" +
            $"&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code" +
            $"&hourly=temperature_2m,weather_code&forecast_hours=24" +
            $"&daily=temperature_2m_max,temperature_2m_min,weather_code" +
            $"&forecast_days={days}&timezone=auto");

        return GetJsonCachedAsync<OpenMeteoForecastResponseDto>(url, ForecastTtl, ct);
    }

    // CHỈ cache response thành công — upstream lỗi (null) không cache để request sau thử lại ngay
    private async Task<T?> GetJsonCachedAsync<T>(string url, TimeSpan ttl, CancellationToken ct) where T : class
    {
        if (cache.TryGetValue(url, out T? cached))
        {
            return cached;
        }

        var result = await GetJsonOrNullAsync<T>(url, ct);
        if (result is not null)
        {
            cache.Set(url, result, ttl);
        }

        return result;
    }

    // Chính sách chung "upstream lỗi => null" cho MỌI lời gọi Open-Meteo (geocode, forecast...):
    // non-2xx, timeout, body không phải JSON hoặc Content-Type lạ đều là upstream lỗi — một nguồn duy nhất.
    private async Task<T?> GetJsonOrNullAsync<T>(string url, CancellationToken ct) where T : class
    {
        try
        {
            using var resp = await http.GetAsync(url, ct);
            if (!resp.IsSuccessStatusCode)
            {
                return null;
            }

            return await resp.Content.ReadFromJsonAsync<T>(ct);
        }
        catch (HttpRequestException)
        {
            return null;
        }
        catch (JsonException)
        {
            return null;
        }
        catch (NotSupportedException)
        {
            // 200 nhưng Content-Type không phải JSON (vd trang lỗi HTML từ proxy/CDN)
            return null;
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            // Timeout của HttpClient (không phải client hủy request) cũng là upstream lỗi
            return null;
        }
    }
}
