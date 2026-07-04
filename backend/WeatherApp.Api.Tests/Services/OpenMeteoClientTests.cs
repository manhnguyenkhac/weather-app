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

        Assert.NotNull(result.Data);
        Assert.False(result.IsStale);
        var item = Assert.Single(result.Data!.Results!);
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

        Assert.Null(result.Data);
    }

    [Fact]
    public async Task SearchLocations_TraNull_KhiBodyKhongPhaiJson()
    {
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, "<html>not json</html>");

        var result = await client.SearchLocationsAsync("Hanoi", 5);

        Assert.Null(result.Data);
    }

    [Fact]
    public async Task SearchLocations_TraNull_Khi200NhungContentTypeKhongPhaiJson()
    {
        // Proxy/CDN chết có thể trả 200 kèm trang HTML — ReadFromJsonAsync ném NotSupportedException
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, "<html>error page</html>", "text/html");

        var result = await client.SearchLocationsAsync("Hanoi", 5);

        Assert.Null(result.Data);
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
            // vi-VN format double bằng dấu phẩy (21,03) — InvariantCulture phải giữ dấu chấm.
            // Tọa độ làm tròn 2 số lẻ (#74): chặn cache phình theo biến thể tọa độ + tăng hit-rate.
            Assert.Contains("latitude=21.03", url);
            Assert.Contains("longitude=105.83", url);
            Assert.Contains("apparent_temperature", url);
            Assert.Contains("relative_humidity_2m", url);
            Assert.Contains("hourly=temperature_2m,weather_code", url);
            // hourly phủ toàn dải ngày (24×days) — KHÔNG giới hạn forecast_hours
            Assert.DoesNotContain("forecast_hours", url);
            Assert.Contains("sunrise,sunset,uv_index_max,precipitation_sum,precipitation_probability_max", url);
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
    public async Task SearchLocations_CacheHit_KhongGoiLaiUpstream_KhiCungThamSo()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, """{"results":[{"name":"Hanoi","country":"Vietnam","latitude":21.0,"longitude":105.8}]}""");
        var client = TestOpenMeteo.CreateClient(handler);

        var first = await client.SearchLocationsAsync("Hanoi", 5);
        var second = await client.SearchLocationsAsync("Hanoi", 5);

        Assert.Equal(1, handler.RequestCount); // lần 2 lấy từ cache
        Assert.Equal(first, second);
    }

    [Fact]
    public async Task SearchLocations_KhongDungCache_KhiThamSoKhac()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, """{"results":[]}""");
        var client = TestOpenMeteo.CreateClient(handler);

        await client.SearchLocationsAsync("Hanoi", 5);
        await client.SearchLocationsAsync("Hanoi", 10);
        await client.SearchLocationsAsync("Hue", 5);

        Assert.Equal(3, handler.RequestCount);
    }

    [Fact]
    public async Task SearchLocations_KhongCacheLoi_UpstreamLoiThiLanSauGoiLai()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.InternalServerError, "boom");
        var client = TestOpenMeteo.CreateClient(handler);

        await client.SearchLocationsAsync("Hanoi", 5);
        await client.SearchLocationsAsync("Hanoi", 5);

        Assert.Equal(2, handler.RequestCount); // null không được cache
    }

    [Fact]
    public async Task GetForecast_CacheHit_KhongGoiLaiUpstream_KhiCungToaDo()
    {
        const string body = """
            {
              "current": { "temperature_2m": 27.4, "wind_speed_10m": 11.2, "weather_code": 3 },
              "daily": { "time": ["2026-07-03"], "temperature_2m_max": [33.1], "temperature_2m_min": [25.6], "weather_code": [80] }
            }
            """;
        var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, body);
        var client = TestOpenMeteo.CreateClient(handler);

        await client.GetForecastAsync(21.0278, 105.8342, 7);
        await client.GetForecastAsync(21.0301, 105.8299, 7); // tọa độ lệch <1.1km — làm tròn về cùng key -> cache hit
        await client.GetForecastAsync(21.0278, 105.8342, 3); // days khác -> URL khác -> gọi thật

        Assert.Equal(2, handler.RequestCount);
    }

    [Fact]
    public async Task GetAirQuality_GhepUrlDungThamSo_VaInvariantCulture()
    {
        var originalCulture = CultureInfo.CurrentCulture;
        CultureInfo.CurrentCulture = new CultureInfo("vi-VN");
        try
        {
            var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, "{}");
            var client = TestOpenMeteo.CreateClient(handler);

            await client.GetAirQualityAsync(21.0278, 105.8342);

            var url = handler.LastRequestUri!.AbsoluteUri;
            Assert.StartsWith(TestOpenMeteo.AirQualityUrl, url);
            Assert.Contains("latitude=21.03", url);
            Assert.Contains("current=us_aqi,pm2_5,pm10,ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide", url);
            Assert.Contains("hourly=us_aqi", url);
            Assert.Contains("forecast_hours=24", url);
            Assert.DoesNotContain("21,0278", url);
        }
        finally
        {
            CultureInfo.CurrentCulture = originalCulture;
        }
    }

    [Fact]
    public async Task GetAirQuality_CacheHit_KhongGoiLaiUpstream()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, """{ "current": { "us_aqi": 50 } }""");
        var client = TestOpenMeteo.CreateClient(handler);

        await client.GetAirQualityAsync(21.0278, 105.8342);
        await client.GetAirQualityAsync(21.0278, 105.8342);

        Assert.Equal(1, handler.RequestCount);
    }

    [Fact]
    public async Task GetForecast_ParseDuocSnakeCase_KhiUpstreamTraJsonHopLe()
    {
        const string body = """
            {
              "current": { "temperature_2m": 27.4, "apparent_temperature": 32.1, "relative_humidity_2m": 78, "wind_speed_10m": 11.2, "weather_code": 3 },
              "hourly": {
                "time": ["2026-07-03T14:00"],
                "temperature_2m": [30.0],
                "weather_code": [3]
              },
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

        var data = result.Data;
        Assert.NotNull(data);
        Assert.Equal(27.4, data!.Current!.Temperature);
        Assert.Equal(32.1, data.Current.ApparentTemperature);
        Assert.Equal(78, data.Current.Humidity);
        Assert.Equal(11.2, data.Current.WindSpeed);
        Assert.Equal(3, data.Current.WeatherCode);
        Assert.Equal("2026-07-03T14:00", Assert.Single(data.Hourly!.Time!));
        Assert.Equal(30.0, Assert.Single(data.Hourly.Temperature!));
        Assert.Equal("2026-07-03", Assert.Single(data.Daily!.Time!));
        Assert.Equal(33.1, Assert.Single(data.Daily.TempMax!));
    }
}
