using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using WeatherApp.Api.Endpoints;
using WeatherApp.Api.Models;
using WeatherApp.Api.Tests.Fakes;

namespace WeatherApp.Api.Tests.Endpoints;

public class AirQualityEndpointsTests
{
    private const string ValidBody = """
        {
          "current": {
            "us_aqi": 132, "pm2_5": 48.2, "pm10": 87.0, "ozone": 61.0,
            "nitrogen_dioxide": 34.0, "sulphur_dioxide": 12.0, "carbon_monoxide": 640.0
          },
          "hourly": {
            "time": ["2026-07-04T10:00", "2026-07-04T11:00", "2026-07-04T12:00"],
            "us_aqi": [128, null, 141]
          }
        }
        """;

    private static readonly (double? Lat, double? Lon) HaNoi = (21.0278, 105.8342);

    [Theory]
    [InlineData(null)]
    [InlineData(-90.1)]
    [InlineData(90.1)]
    [InlineData(double.NaN)]
    public async Task AirQuality_Tra400_KhiLatThieuHoacNgoaiKhoang(double? lat)
    {
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, ValidBody);

        var result = await AirQualityEndpoints.HandleAsync(lat, HaNoi.Lon, client, CancellationToken.None);

        var problem = Assert.IsType<ProblemHttpResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(-180.1)]
    [InlineData(180.1)]
    public async Task AirQuality_Tra400_KhiLonThieuHoacNgoaiKhoang(double? lon)
    {
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, ValidBody);

        var result = await AirQualityEndpoints.HandleAsync(HaNoi.Lat, lon, client, CancellationToken.None);

        var problem = Assert.IsType<ProblemHttpResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
    }

    [Theory]
    [InlineData("boom", HttpStatusCode.BadGateway)]
    // 200 nhưng thiếu hẳn current
    [InlineData("{}", HttpStatusCode.OK)]
    // 200 có current nhưng us_aqi null — không dựng được headline
    [InlineData("""{ "current": { "us_aqi": null, "pm2_5": 10 } }""", HttpStatusCode.OK)]
    public async Task AirQuality_Tra502_KhiUpstreamLoiHoacThieuUsAqi(string body, HttpStatusCode upstreamStatus)
    {
        var client = TestOpenMeteo.CreateClient(upstreamStatus, body);

        var result = await AirQualityEndpoints.HandleAsync(HaNoi.Lat, HaNoi.Lon, client, CancellationToken.None);

        var problem = Assert.IsType<ProblemHttpResult>(result);
        Assert.Equal(StatusCodes.Status502BadGateway, problem.StatusCode);
    }

    [Fact]
    public async Task AirQuality_Tra200DungContract_GioNullBiLoaiKhoiHourly()
    {
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, ValidBody);

        var result = await AirQualityEndpoints.HandleAsync(HaNoi.Lat, HaNoi.Lon, client, CancellationToken.None);

        var ok = Assert.IsType<Ok<AirQualityResponseDto>>(result);
        var response = ok.Value!;
        Assert.Equal(new AirQualityCurrentDto(132, 48.2, 87.0, 61.0, 34.0, 12.0, 640.0), response.Current);
        // 3 giờ upstream nhưng giờ 11:00 us_aqi null → chỉ còn 2
        Assert.Equal(2, response.Hourly.Count);
        Assert.Equal(new AirQualityHourDto("2026-07-04T10:00", 128), response.Hourly[0]);
        Assert.Equal(new AirQualityHourDto("2026-07-04T12:00", 141), response.Hourly[1]);
    }

    [Fact]
    public async Task AirQuality_Tra200MangHourlyRong_KhiUpstreamKhongCoHourly()
    {
        const string body = """
            { "current": { "us_aqi": 45, "pm2_5": 8.1, "pm10": 15.0, "ozone": 40.0,
              "nitrogen_dioxide": 10.0, "sulphur_dioxide": 2.0, "carbon_monoxide": 200.0 } }
            """;
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, body);

        var result = await AirQualityEndpoints.HandleAsync(HaNoi.Lat, HaNoi.Lon, client, CancellationToken.None);

        var ok = Assert.IsType<Ok<AirQualityResponseDto>>(result);
        Assert.Equal(45, ok.Value!.Current.UsAqi);
        Assert.Empty(ok.Value.Hourly);
    }

    [Fact]
    public async Task AirQuality_ChatThieu_VeKhong_KhongPhai502()
    {
        const string body = """{ "current": { "us_aqi": 70, "pm2_5": null, "pm10": 20.0 } }""";
        var client = TestOpenMeteo.CreateClient(HttpStatusCode.OK, body);

        var result = await AirQualityEndpoints.HandleAsync(HaNoi.Lat, HaNoi.Lon, client, CancellationToken.None);

        var ok = Assert.IsType<Ok<AirQualityResponseDto>>(result);
        Assert.Equal(0, ok.Value!.Current.Pm25);
        Assert.Equal(20.0, ok.Value.Current.Pm10);
    }
}
