using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Configuration;
using WeatherApp.Api.Endpoints;
using WeatherApp.Api.Models;
using WeatherApp.Api.Services;
using WeatherApp.Api.Tests.Fakes;

namespace WeatherApp.Api.Tests.Endpoints;

public class GeocodeEndpointsTests
{
    private static OpenMeteoClient CreateClient(HttpStatusCode statusCode, string body)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OpenMeteo:GeocodingUrl"] = "https://geo.test/v1/search",
            })
            .Build();

        return new OpenMeteoClient(new HttpClient(new FakeHttpMessageHandler(statusCode, body)), config);
    }

    private static OpenMeteoClient CreateHealthyClient() =>
        CreateClient(HttpStatusCode.OK, """{"results":[]}""");

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task Geocode_Tra400_KhiQThieuHoacRong(string? q)
    {
        var result = await GeocodeEndpoints.HandleAsync(q, count: null, CreateHealthyClient(), CancellationToken.None);

        var problem = Assert.IsType<ProblemHttpResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    [InlineData(101)]
    public async Task Geocode_Tra400_KhiCountNgoaiKhoang(int count)
    {
        var result = await GeocodeEndpoints.HandleAsync("Hanoi", count, CreateHealthyClient(), CancellationToken.None);

        var problem = Assert.IsType<ProblemHttpResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
    }

    [Fact]
    public async Task Geocode_Tra502_KhiUpstreamLoi()
    {
        var client = CreateClient(HttpStatusCode.ServiceUnavailable, "unavailable");

        var result = await GeocodeEndpoints.HandleAsync("Hanoi", count: null, client, CancellationToken.None);

        var problem = Assert.IsType<ProblemHttpResult>(result);
        Assert.Equal(StatusCodes.Status502BadGateway, problem.StatusCode);
    }

    [Fact]
    public async Task Geocode_Tra200VoiDanhSachDaMap_KhiUpstreamCoKetQua()
    {
        const string body = """
            {"results":[
              {"name":"Hanoi","country":"Vietnam","latitude":21.0245,"longitude":105.8412},
              {"name":"Ha Noi","latitude":21.0333,"longitude":105.85}
            ]}
            """;
        var client = CreateClient(HttpStatusCode.OK, body);

        var result = await GeocodeEndpoints.HandleAsync("Hanoi", count: 2, client, CancellationToken.None);

        var ok = Assert.IsType<Ok<List<GeocodeResultDto>>>(result);
        Assert.Equal(2, ok.Value!.Count);
        Assert.Equal(new GeocodeResultDto("Hanoi", "Vietnam", 21.0245, 105.8412), ok.Value[0]);
        // country thiếu bên Open-Meteo được map thành chuỗi rỗng, không phải null
        Assert.Equal("", ok.Value[1].Country);
    }

    [Fact]
    public async Task Geocode_Tra200MangRong_KhiOpenMeteoKhongCoKetQua()
    {
        // Open-Meteo bỏ hẳn key "results" khi không tìm thấy gì
        var client = CreateClient(HttpStatusCode.OK, "{}");

        var result = await GeocodeEndpoints.HandleAsync("xyzabc123", count: null, client, CancellationToken.None);

        var ok = Assert.IsType<Ok<List<GeocodeResultDto>>>(result);
        Assert.Empty(ok.Value!);
    }
}
