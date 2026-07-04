using System.Net;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using WeatherApp.Api.Services;

namespace WeatherApp.Api.Tests.Fakes;

/// <summary>
/// Factory dùng chung để dựng OpenMeteoClient với HTTP giả — một nơi duy nhất giữ key config.
/// Mặc định TẮT retry (retryDelays rỗng) để test cache/endpoint giữ ngữ nghĩa "1 fetch = 1 request";
/// test retry truyền delays riêng (TimeSpan.Zero cho nhanh).
/// </summary>
public static class TestOpenMeteo
{
    public const string GeocodingUrl = "https://geo.test/v1/search";
    public const string ForecastUrl = "https://forecast.test/v1/forecast";
    public const string AirQualityUrl = "https://air.test/v1/air-quality";

    public static OpenMeteoClient CreateClient(
        HttpMessageHandler handler,
        TimeProvider? time = null,
        IReadOnlyList<TimeSpan>? retryDelays = null)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OpenMeteo:GeocodingUrl"] = GeocodingUrl,
                ["OpenMeteo:ForecastUrl"] = ForecastUrl,
                ["OpenMeteo:AirQualityUrl"] = AirQualityUrl,
            })
            .Build();

        return new OpenMeteoClient(
            new HttpClient(handler), config, new MemoryCache(new MemoryCacheOptions()),
            time, retryDelays ?? []);
    }

    public static OpenMeteoClient CreateClient(HttpStatusCode statusCode, string body, string contentType = "application/json") =>
        CreateClient(new FakeHttpMessageHandler(statusCode, body, contentType));
}
