using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using WeatherApp.Api.Endpoints;
using WeatherApp.Api.Models;
using WeatherApp.Api.Tests.Fakes;

namespace WeatherApp.Api.Tests.Endpoints;

public class WeatherEndpointsTests
{
    private const string ValidBody = """
        {
          "current": { "temperature_2m": 27.4, "apparent_temperature": 32.1, "relative_humidity_2m": 78, "wind_speed_10m": 11.2, "weather_code": 3 },
          "hourly": {
            "time": ["2026-07-03T14:00", "2026-07-03T15:00"],
            "temperature_2m": [30.0, 29.5],
            "weather_code": [3, 61]
          },
          "daily": {
            "time": ["2026-07-03", "2026-07-04"],
            "temperature_2m_max": [33.1, 32.0],
            "temperature_2m_min": [25.6, 25.1],
            "weather_code": [80, 61]
          }
        }
        """;

    private static readonly (double? Lat, double? Lon) HaNoi = (21.0278, 105.8342);

    [Theory]
    [InlineData(null)]
    [InlineData(-90.1)]
    [InlineData(90.1)]
    [InlineData(double.NaN)]
    public async Task Weather_Tra400_KhiLatThieuHoacNgoaiKhoang(double? lat)
    {
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, ValidBody);

        var result = await WeatherEndpoints.HandleAsync(lat, HaNoi.Lon, days: null, client, CancellationToken.None);

        var problem = Assert.IsType<ProblemHttpResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(-180.1)]
    [InlineData(180.1)]
    public async Task Weather_Tra400_KhiLonThieuHoacNgoaiKhoang(double? lon)
    {
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, ValidBody);

        var result = await WeatherEndpoints.HandleAsync(HaNoi.Lat, lon, days: null, client, CancellationToken.None);

        var problem = Assert.IsType<ProblemHttpResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(17)]
    public async Task Weather_Tra400_KhiDaysNgoaiKhoang(int days)
    {
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, ValidBody);

        var result = await WeatherEndpoints.HandleAsync(HaNoi.Lat, HaNoi.Lon, days, client, CancellationToken.None);

        var problem = Assert.IsType<ProblemHttpResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
    }

    [Fact]
    public async Task Weather_Tra502_KhiUpstreamLoi()
    {
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.BadGateway, "boom");

        var result = await WeatherEndpoints.HandleAsync(HaNoi.Lat, HaNoi.Lon, days: null, client, CancellationToken.None);

        var problem = Assert.IsType<ProblemHttpResult>(result);
        Assert.Equal(StatusCodes.Status502BadGateway, problem.StatusCode);
    }

    [Theory]
    [InlineData("{}")]
    // Thiếu hourly + daily
    [InlineData("""{ "current": { "temperature_2m": 1, "apparent_temperature": 1, "relative_humidity_2m": 50, "wind_speed_10m": 2, "weather_code": 3 } }""")]
    // Thiếu current + hourly
    [InlineData("""{ "daily": { "time": ["2026-07-03"], "temperature_2m_max": [1], "temperature_2m_min": [0], "weather_code": [0] } }""")]
    // Có current + daily nhưng thiếu hourly
    [InlineData("""
        {
          "current": { "temperature_2m": 1, "apparent_temperature": 1, "relative_humidity_2m": 50, "wind_speed_10m": 2, "weather_code": 3 },
          "daily": { "time": ["2026-07-03"], "temperature_2m_max": [1], "temperature_2m_min": [0], "weather_code": [0] }
        }
        """)]
    public async Task Weather_Tra502_KhiBody200ThieuBlock(string body)
    {
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, body);

        var result = await WeatherEndpoints.HandleAsync(HaNoi.Lat, HaNoi.Lon, days: null, client, CancellationToken.None);

        var problem = Assert.IsType<ProblemHttpResult>(result);
        Assert.Equal(StatusCodes.Status502BadGateway, problem.StatusCode);
    }

    [Fact]
    public async Task Weather_Tra200DungContract_KhiUpstreamHopLe()
    {
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, ValidBody);

        var result = await WeatherEndpoints.HandleAsync(HaNoi.Lat, HaNoi.Lon, days: 2, client, CancellationToken.None);

        var ok = Assert.IsType<Ok<WeatherResponseDto>>(result);
        var response = ok.Value!;
        Assert.Equal(new CurrentWeatherDto(27.4, 32.1, 78, 11.2, 3), response.Current);
        Assert.Equal(2, response.Hourly.Count);
        Assert.Equal(new HourlyForecastDto("2026-07-03T14:00", 30.0, 3), response.Hourly[0]);
        Assert.Equal(2, response.Daily.Count);
        Assert.Equal(new DailyForecastDto("2026-07-03", 33.1, 25.6, 80), response.Daily[0]);
        Assert.Equal(new DailyForecastDto("2026-07-04", 32.0, 25.1, 61), response.Daily[1]);
    }

    [Fact]
    public async Task Weather_ZipTheoMangNganNhat_KhiMangCotLechNhau()
    {
        // Upstream bất thường: hourly.time có 2 giờ nhưng temperature chỉ 1; daily.time 2 ngày nhưng min chỉ 1
        const string raggedBody = """
            {
              "current": { "temperature_2m": 27.4, "apparent_temperature": 32.1, "relative_humidity_2m": 78, "wind_speed_10m": 11.2, "weather_code": 3 },
              "hourly": {
                "time": ["2026-07-03T14:00", "2026-07-03T15:00"],
                "temperature_2m": [30.0],
                "weather_code": [3, 61]
              },
              "daily": {
                "time": ["2026-07-03", "2026-07-04"],
                "temperature_2m_max": [33.1, 32.0],
                "temperature_2m_min": [25.6],
                "weather_code": [80, 61]
              }
            }
            """;
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, raggedBody);

        var result = await WeatherEndpoints.HandleAsync(HaNoi.Lat, HaNoi.Lon, days: null, client, CancellationToken.None);

        var ok = Assert.IsType<Ok<WeatherResponseDto>>(result);
        Assert.Single(ok.Value!.Hourly);
        var day = Assert.Single(ok.Value.Daily);
        Assert.Equal("2026-07-03", day.Date);
    }
}
