using System.Globalization;
using System.Net;
using WeatherApp.Api.Tests.Fakes;

namespace WeatherApp.Api.Tests.Services;

public class OpenMeteoClientTests
{
    [Fact]
    public async Task SearchLocations_GhepUrlDungThamSo_VaEscapeQuery()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, """{"results":[]}""");
        var client = TestOpenMeteo.CreateClient(handler);

        await client.SearchLocationsAsync("Hà Nội", 5);

        Assert.NotNull(handler.LastRequestUri);
        // AbsoluteUri giữ nguyên percent-encoding (ToString() sẽ un-escape để hiển thị)
        var url = handler.LastRequestUri!.AbsoluteUri;
        Assert.StartsWith(TestOpenMeteo.GeocodingUrl, url);
        Assert.Contains("name=H%C3%A0%20N%E1%BB%99i", url);
        Assert.Contains("count=5", url);
    }

    [Fact]
    public async Task SearchLocations_FormatSoTheoInvariantCulture_KhiCultureViVN()
    {
        var originalCulture = CultureInfo.CurrentCulture;
        CultureInfo.CurrentCulture = new CultureInfo("vi-VN");
        try
        {
            var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, """{"results":[]}""");
            var client = TestOpenMeteo.CreateClient(handler);

            await client.SearchLocationsAsync("Hanoi", 10);

            // count là số nguyên nhưng URL tuyệt đối không được nhiễm định dạng culture
            Assert.Contains("count=10", handler.LastRequestUri!.ToString());
        }
        finally
        {
            CultureInfo.CurrentCulture = originalCulture;
        }
    }

    [Fact]
    public async Task SearchLocations_ParseDuocKetQua_KhiUpstreamTraJsonHopLe()
    {
        const string body = """
            {"results":[{"name":"Hanoi","country":"Vietnam","latitude":21.0245,"longitude":105.8412}]}
            """;
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, body);

        var result = await client.SearchLocationsAsync("Hanoi", 5);

        Assert.NotNull(result);
        var item = Assert.Single(result!.Results!);
        Assert.Equal("Hanoi", item.Name);
        Assert.Equal("Vietnam", item.Country);
        Assert.Equal(21.0245, item.Latitude);
        Assert.Equal(105.8412, item.Longitude);
    }

    [Fact]
    public async Task SearchLocations_TraNull_KhiUpstreamNon2xx()
    {
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.InternalServerError, "boom");

        var result = await client.SearchLocationsAsync("Hanoi", 5);

        Assert.Null(result);
    }

    [Fact]
    public async Task SearchLocations_TraNull_KhiBodyKhongPhaiJson()
    {
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, "<html>not json</html>");

        var result = await client.SearchLocationsAsync("Hanoi", 5);

        Assert.Null(result);
    }

    [Fact]
    public async Task SearchLocations_TraNull_Khi200NhungContentTypeKhongPhaiJson()
    {
        // Proxy/CDN chết có thể trả 200 kèm trang HTML — ReadFromJsonAsync ném NotSupportedException
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, "<html>error page</html>", "text/html");

        var result = await client.SearchLocationsAsync("Hanoi", 5);

        Assert.Null(result);
    }

    [Fact]
    public async Task GetForecast_FormatLatLonDauCham_KhiCultureViVN()
    {
        var originalCulture = CultureInfo.CurrentCulture;
        CultureInfo.CurrentCulture = new CultureInfo("vi-VN");
        try
        {
            var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, "{}");
            var client = TestOpenMeteo.CreateClient(handler);

            await client.GetForecastAsync(21.0278, 105.8342, 7);

            var url = handler.LastRequestUri!.AbsoluteUri;
            Assert.StartsWith(TestOpenMeteo.ForecastUrl, url);
            // vi-VN format double bằng dấu phẩy (21,0278) — InvariantCulture phải giữ dấu chấm
            Assert.Contains("latitude=21.0278", url);
            Assert.Contains("longitude=105.8342", url);
            Assert.Contains("forecast_days=7", url);
            Assert.Contains("timezone=auto", url);
            Assert.DoesNotContain("21,0278", url);
        }
        finally
        {
            CultureInfo.CurrentCulture = originalCulture;
        }
    }

    [Fact]
    public async Task GetForecast_ParseDuocSnakeCase_KhiUpstreamTraJsonHopLe()
    {
        const string body = """
            {
              "current": { "temperature_2m": 27.4, "wind_speed_10m": 11.2, "weather_code": 3 },
              "daily": {
                "time": ["2026-07-03"],
                "temperature_2m_max": [33.1],
                "temperature_2m_min": [25.6],
                "weather_code": [80]
              }
            }
            """;
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, body);

        var result = await client.GetForecastAsync(21.0278, 105.8342, 1);

        Assert.NotNull(result);
        Assert.Equal(27.4, result!.Current!.Temperature);
        Assert.Equal(11.2, result.Current.WindSpeed);
        Assert.Equal(3, result.Current.WeatherCode);
        Assert.Equal("2026-07-03", Assert.Single(result.Daily!.Time!));
        Assert.Equal(33.1, Assert.Single(result.Daily.TempMax!));
    }
}
