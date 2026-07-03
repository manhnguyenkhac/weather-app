using System.Globalization;
using System.Net;
using Microsoft.Extensions.Configuration;
using WeatherApp.Api.Services;
using WeatherApp.Api.Tests.Fakes;

namespace WeatherApp.Api.Tests.Services;

public class OpenMeteoClientTests
{
    private const string GeocodingUrl = "https://geo.test/v1/search";

    private static OpenMeteoClient CreateClient(FakeHttpMessageHandler handler)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["OpenMeteo:GeocodingUrl"] = GeocodingUrl,
            })
            .Build();

        return new OpenMeteoClient(new HttpClient(handler), config);
    }

    [Fact]
    public async Task SearchLocations_GhepUrlDungThamSo_VaEscapeQuery()
    {
        var handler = new FakeHttpMessageHandler(HttpStatusCode.OK, """{"results":[]}""");
        var client = CreateClient(handler);

        await client.SearchLocationsAsync("Hà Nội", 5);

        Assert.NotNull(handler.LastRequestUri);
        // AbsoluteUri giữ nguyên percent-encoding (ToString() sẽ un-escape để hiển thị)
        var url = handler.LastRequestUri!.AbsoluteUri;
        Assert.StartsWith(GeocodingUrl, url);
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
            var client = CreateClient(handler);

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
        var client = CreateClient(new FakeHttpMessageHandler(HttpStatusCode.OK, body));

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
        var client = CreateClient(new FakeHttpMessageHandler(HttpStatusCode.InternalServerError, "boom"));

        var result = await client.SearchLocationsAsync("Hanoi", 5);

        Assert.Null(result);
    }

    [Fact]
    public async Task SearchLocations_TraNull_KhiBodyKhongPhaiJson()
    {
        var client = CreateClient(new FakeHttpMessageHandler(HttpStatusCode.OK, "<html>not json</html>"));

        var result = await client.SearchLocationsAsync("Hanoi", 5);

        Assert.Null(result);
    }
}
