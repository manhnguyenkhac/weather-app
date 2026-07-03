using System.Net;
using Microsoft.Extensions.Configuration;
using WeatherApp.Api.Services;

namespace WeatherApp.Api.Tests.Fakes;

/// <summary>
/// Factory dùng chung để dựng OpenMeteoClient với HTTP giả — một nơi duy nhất giữ key config.
/// </summary>
public static class TestOpenMeteo
{
    public const string GeocodingUrl = "https://geo.test/v1/search";
    public const string ForecastUrl = "https://forecast.test/v1/forecast";

    public static OpenMeteoClient CreateClient(FakeHttpMessageHandler handler)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OpenMeteo:GeocodingUrl"] = GeocodingUrl,
                ["OpenMeteo:ForecastUrl"] = ForecastUrl,
            })
            .Build();

        return new OpenMeteoClient(new HttpClient(handler), config);
    }

    public static OpenMeteoClient CreateClient(HttpStatusCode statusCode, string body, string contentType = "application/json") =>
        CreateClient(new FakeHttpMessageHandler(statusCode, body, contentType));
}
