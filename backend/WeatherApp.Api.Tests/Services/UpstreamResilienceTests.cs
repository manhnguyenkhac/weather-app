using System.Net;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using WeatherApp.Api.Endpoints;
using WeatherApp.Api.Models;
using WeatherApp.Api.Tests.Fakes;

namespace WeatherApp.Api.Tests.Services;

/// <summary>
/// Test chống lỗi upstream (#61): retry có backoff cho lỗi transient + serve-stale khi upstream chết.
/// </summary>
public class UpstreamResilienceTests
{
    private static readonly TimeSpan[] NoWaitRetries = [TimeSpan.Zero, TimeSpan.Zero];
    private static readonly DateTimeOffset T0 = new(2026, 7, 4, 12, 0, 0, TimeSpan.Zero);

    private const string GeocodeBody = """{"results":[{"name":"Hanoi","country":"Vietnam","latitude":21.0,"longitude":105.8}]}""";

    // ---------- Retry ----------

    [Fact]
    public async Task Retry_ThuLaiToiDa3Lan_KhiUpstream5xxRoiSong()
    {
        var handler = new SequenceHttpMessageHandler(
            (HttpStatusCode.InternalServerError, "boom"),
            (HttpStatusCode.BadGateway, "boom"),
            (HttpStatusCode.OK, GeocodeBody));
        var client = TestOpenMeteo.CreateClient(handler, retryDelays: NoWaitRetries);

        var result = await client.SearchLocationsAsync("Hanoi", 5);

        Assert.Equal(3, handler.RequestCount);
        Assert.NotNull(result.Data);
        Assert.False(result.IsStale);
    }

    [Fact]
    public async Task Retry_BoCuoc_KhiUpstream5xxCaBaLan()
    {
        var handler = new SequenceHttpMessageHandler((HttpStatusCode.InternalServerError, "boom"));
        var client = TestOpenMeteo.CreateClient(handler, retryDelays: NoWaitRetries);

        var result = await client.SearchLocationsAsync("Hanoi", 5);

        Assert.Equal(3, handler.RequestCount); // 1 lần đầu + 2 retry
        Assert.Null(result.Data);
    }

    [Fact]
    public async Task Retry_KhongRetry_KhiUpstream4xx()
    {
        // 400 = request sai — retry vô ích, phải fail ngay dù lần 2 upstream "sống"
        var handler = new SequenceHttpMessageHandler(
            (HttpStatusCode.BadRequest, "bad"),
            (HttpStatusCode.OK, GeocodeBody));
        var client = TestOpenMeteo.CreateClient(handler, retryDelays: NoWaitRetries);

        var result = await client.SearchLocationsAsync("Hanoi", 5);

        Assert.Equal(1, handler.RequestCount);
        Assert.Null(result.Data);
    }

    [Fact]
    public async Task Retry_429DuocCoiLaTransient_VaThuLai()
    {
        var handler = new SequenceHttpMessageHandler(
            (HttpStatusCode.TooManyRequests, "slow down"),
            (HttpStatusCode.OK, GeocodeBody));
        var client = TestOpenMeteo.CreateClient(handler, retryDelays: NoWaitRetries);

        var result = await client.SearchLocationsAsync("Hanoi", 5);

        Assert.Equal(2, handler.RequestCount);
        Assert.NotNull(result.Data);
    }

    // ---------- Serve-stale ----------

    [Fact]
    public async Task ServeStale_TraBanCu_KhiHetTtlTuoiVaUpstreamChet()
    {
        var handler = new SequenceHttpMessageHandler(
            (HttpStatusCode.OK, GeocodeBody),
            (HttpStatusCode.InternalServerError, "boom"));
        var time = new FakeTimeProvider(T0);
        var client = TestOpenMeteo.CreateClient(handler, time);

        var fresh = await client.SearchLocationsAsync("Hanoi", 5);
        time.Advance(TimeSpan.FromHours(2)); // qua TTL tươi geocode (1h), còn trong stale horizon (24h)
        var stale = await client.SearchLocationsAsync("Hanoi", 5);

        Assert.Equal(2, handler.RequestCount); // lần 2 có gọi thật nhưng thất bại
        Assert.False(fresh.IsStale);
        Assert.True(stale.IsStale);
        Assert.Equal(fresh.Data, stale.Data); // bản cũ chính là dữ liệu lần đầu
    }

    [Fact]
    public async Task ServeStale_Tra502_KhiQuaStaleHorizon()
    {
        var handler = new SequenceHttpMessageHandler(
            (HttpStatusCode.OK, GeocodeBody),
            (HttpStatusCode.InternalServerError, "boom"));
        var time = new FakeTimeProvider(T0);
        var client = TestOpenMeteo.CreateClient(handler, time);

        await client.SearchLocationsAsync("Hanoi", 5);
        time.Advance(TimeSpan.FromHours(25)); // qua cả stale horizon geocode (24h)
        var result = await client.SearchLocationsAsync("Hanoi", 5);

        Assert.Null(result.Data); // bản cũ quá hạn — không dùng đỡ nữa
    }

    [Fact]
    public async Task ServeStale_UpstreamSongLai_ThiRefreshVaHetStale()
    {
        var handler = new SequenceHttpMessageHandler(
            (HttpStatusCode.OK, GeocodeBody),
            (HttpStatusCode.InternalServerError, "boom"),
            (HttpStatusCode.OK, """{"results":[]}"""));
        var time = new FakeTimeProvider(T0);
        var client = TestOpenMeteo.CreateClient(handler, time);

        await client.SearchLocationsAsync("Hanoi", 5);         // fresh, cache
        time.Advance(TimeSpan.FromHours(2));
        var stale = await client.SearchLocationsAsync("Hanoi", 5);   // upstream chết → stale
        var revived = await client.SearchLocationsAsync("Hanoi", 5); // upstream sống lại → fresh mới

        Assert.True(stale.IsStale);
        Assert.False(revived.IsStale);
        Assert.Empty(revived.Data!.Results!); // dữ liệu MỚI, không phải bản cũ
    }

    [Fact]
    public async Task ServeStale_TrongTtlTuoi_KhongGoiUpstream()
    {
        var handler = new SequenceHttpMessageHandler((HttpStatusCode.OK, GeocodeBody));
        var time = new FakeTimeProvider(T0);
        var client = TestOpenMeteo.CreateClient(handler, time);

        await client.SearchLocationsAsync("Hanoi", 5);
        time.Advance(TimeSpan.FromMinutes(30)); // vẫn trong TTL tươi 1h
        var result = await client.SearchLocationsAsync("Hanoi", 5);

        Assert.Equal(1, handler.RequestCount);
        Assert.False(result.IsStale);
    }

    // ---------- Endpoint: header X-Data-Stale ----------

    [Fact]
    public async Task Endpoint_TraStaleOkResult_KhiDataLaStale()
    {
        var handler = new SequenceHttpMessageHandler(
            (HttpStatusCode.OK, GeocodeBody),
            (HttpStatusCode.InternalServerError, "boom"));
        var time = new FakeTimeProvider(T0);
        var client = TestOpenMeteo.CreateClient(handler, time);

        await GeocodeEndpoints.HandleAsync("Hanoi", 5, client, CancellationToken.None);
        time.Advance(TimeSpan.FromHours(2));
        var result = await GeocodeEndpoints.HandleAsync("Hanoi", 5, client, CancellationToken.None);

        var staleOk = Assert.IsType<StaleOkResult<List<GeocodeResultDto>>>(result);
        Assert.Equal("Hanoi", Assert.Single(staleOk.Value).Name);
    }

    [Fact]
    public async Task StaleOkResult_GhiHeaderXDataStale_VaTra200()
    {
        var result = new StaleOkResult<string>("payload");
        var httpContext = new DefaultHttpContext
        {
            RequestServices = new ServiceCollection().AddLogging().BuildServiceProvider(),
        };
        httpContext.Response.Body = new MemoryStream();

        await result.ExecuteAsync(httpContext);

        Assert.Equal("true", httpContext.Response.Headers["X-Data-Stale"]);
        Assert.Equal(StatusCodes.Status200OK, httpContext.Response.StatusCode);
    }
}
