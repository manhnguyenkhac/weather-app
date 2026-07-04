using System.Net;
using Microsoft.Extensions.Logging;
using WeatherApp.Api.Services;
using WeatherApp.Api.Tests.Fakes;

namespace WeatherApp.Api.Tests.Services;

/// <summary>
/// Observability (#80): mỗi lời gọi Open-Meteo phải để lại dấu vết trong log — status, kind,
/// serve-stale, fail. Vụ 502 production trước đây mò tay vì không có log nào.
/// </summary>
public class OpenMeteoLoggingTests
{
    private static readonly TimeSpan[] NoWaitRetries = [TimeSpan.Zero, TimeSpan.Zero];
    private static readonly DateTimeOffset T0 = new(2026, 7, 4, 12, 0, 0, TimeSpan.Zero);

    private const string GeocodeBody = """{"results":[{"name":"Hanoi","country":"Vietnam","latitude":21.0,"longitude":105.8}]}""";

    [Fact]
    public async Task ThanhCong_LogInformation_KemKindVaLatency()
    {
        var logger = new CapturingLogger<OpenMeteoClient>();
        var client = TestOpenMeteo.CreateClient(new FakeHttpMessageHandler(HttpStatusCode.OK, GeocodeBody), logger: logger);

        await client.SearchLocationsAsync("Hanoi", 5);

        var info = logger.Messages(LogLevel.Information);
        Assert.Contains(info, m => m.Contains("geocode") && m.Contains("200") && m.Contains("ms"));
    }

    [Fact]
    public async Task UpstreamLoi_KhongCache_LogWarningFailed()
    {
        var logger = new CapturingLogger<OpenMeteoClient>();
        var client = TestOpenMeteo.CreateClient(
            new FakeHttpMessageHandler(HttpStatusCode.BadGateway, "boom"), retryDelays: NoWaitRetries, logger: logger);

        var result = await client.SearchLocationsAsync("Hanoi", 5);

        Assert.Null(result.Data);
        var warnings = logger.Messages(LogLevel.Warning);
        // Mỗi attempt log HTTP 502 + một dòng FAILED tổng kết
        Assert.Contains(warnings, m => m.Contains("geocode") && m.Contains("502"));
        Assert.Contains(warnings, m => m.Contains("FAILED"));
    }

    [Fact]
    public async Task ServeStale_LogWarning_KemTuoiCache()
    {
        var logger = new CapturingLogger<OpenMeteoClient>();
        var time = new FakeTimeProvider(T0);
        var handler = new SequenceHttpMessageHandler(
            (HttpStatusCode.OK, GeocodeBody),
            (HttpStatusCode.InternalServerError, "boom"));
        var client = TestOpenMeteo.CreateClient(handler, time, logger: logger);

        await client.SearchLocationsAsync("Hanoi", 5); // fresh, cache
        time.Advance(TimeSpan.FromHours(2)); // qua TTL tươi geocode (1h)
        var stale = await client.SearchLocationsAsync("Hanoi", 5); // upstream chết → stale

        Assert.True(stale.IsStale);
        Assert.Contains(logger.Messages(LogLevel.Warning), m => m.Contains("SERVE-STALE") && m.Contains("geocode"));
    }

    [Fact]
    public async Task CacheHit_KhongLogInformation_ChiDebug()
    {
        var logger = new CapturingLogger<OpenMeteoClient>();
        var time = new FakeTimeProvider(T0);
        var client = TestOpenMeteo.CreateClient(new FakeHttpMessageHandler(HttpStatusCode.OK, GeocodeBody), time, logger: logger);

        await client.SearchLocationsAsync("Hanoi", 5); // fetch thật — 1 Information
        await client.SearchLocationsAsync("Hanoi", 5); // cache hit — không thêm Information

        // Chỉ đúng 1 dòng Information (lần fetch thật); cache hit đẩy xuống Debug để đỡ nhiễu
        Assert.Single(logger.Messages(LogLevel.Information));
        Assert.Contains(logger.Messages(LogLevel.Debug), m => m.Contains("cache hit"));
    }
}
