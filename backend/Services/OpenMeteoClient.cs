using System.Globalization;
using System.Text.Json;
using WeatherApp.Api.Models;

namespace WeatherApp.Api.Services;

/// <summary>
/// Typed client gọi Open-Meteo. URL đọc từ appsettings.json (section OpenMeteo).
/// Trả null khi upstream lỗi (non-2xx, timeout, body không parse được) — endpoint map thành 502.
/// </summary>
public class OpenMeteoClient(HttpClient http, IConfiguration config)
{
    public async Task<OpenMeteoGeocodeResponse?> SearchLocationsAsync(string query, int count, CancellationToken ct = default)
    {
        var url = string.Create(CultureInfo.InvariantCulture,
            $"{config["OpenMeteo:GeocodingUrl"]}?name={Uri.EscapeDataString(query)}&count={count}&language=en&format=json");

        try
        {
            using var resp = await http.GetAsync(url, ct);
            if (!resp.IsSuccessStatusCode)
            {
                return null;
            }

            return await resp.Content.ReadFromJsonAsync<OpenMeteoGeocodeResponse>(ct);
        }
        catch (HttpRequestException)
        {
            return null;
        }
        catch (JsonException)
        {
            return null;
        }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested)
        {
            // Timeout của HttpClient (không phải client hủy request) cũng là upstream lỗi
            return null;
        }
    }
}
