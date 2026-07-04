using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http;
using WeatherApp.Api.Models;
using WeatherApp.Api.Services;
using WeatherApp.Api.Tests.Fakes;

namespace WeatherApp.Api.Tests.Integration;

/// <summary>
/// Integration test qua HTTP pipeline THẬT (#83) — phủ lớp middleware mà unit test gọi thẳng
/// HandleAsync bỏ qua: routing, ForwardedHeaders, rate limiter, content-type ProblemDetails,
/// header X-Data-Stale. Upstream Open-Meteo bị thay bằng fake handler — không request nào ra internet.
/// </summary>
public class ApiIntegrationTests
{
    private const string ValidForecastBody = """
        {
          "current": { "time": "2026-07-04T14:15", "temperature_2m": 27.4, "apparent_temperature": 32.1, "relative_humidity_2m": 78, "wind_speed_10m": 11.2, "weather_code": 3 },
          "hourly": { "time": ["2026-07-04T14:00"], "temperature_2m": [30.0], "weather_code": [3] },
          "daily": { "time": ["2026-07-04"], "temperature_2m_max": [33.1], "temperature_2m_min": [25.6], "weather_code": [80] }
        }
        """;

    /// <summary>Dựng cả app in-memory; thay primary handler của typed client + TimeProvider nếu cần.</summary>
    private static WebApplicationFactory<Program> CreateApp(HttpMessageHandler upstream, TimeProvider? time = null)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Typed client AddHttpClient<OpenMeteoClient>() đăng ký theo tên class —
                // chèn PrimaryHandler giả vào đúng named client đó
                services.Configure<HttpClientFactoryOptions>(nameof(OpenMeteoClient), o =>
                    o.HttpMessageHandlerBuilderActions.Add(b => b.PrimaryHandler = upstream));

                if (time is not null)
                {
                    services.AddSingleton(time); // đăng ký sau Program → DI resolve bản này
                }
            });
        });
    }

    [Fact]
    public async Task Health_Tra200_QuaHttpThat()
    {
        await using var app = CreateApp(new FakeHttpMessageHandler(HttpStatusCode.OK, "{}"));
        using var client = app.CreateClient();

        var resp = await client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
    }

    [Fact]
    public async Task Weather_HappyPath_DungContractQuaHttp()
    {
        await using var app = CreateApp(new FakeHttpMessageHandler(HttpStatusCode.OK, ValidForecastBody));
        using var client = app.CreateClient();

        var resp = await client.GetAsync("/api/weather?lat=21.03&lon=105.83&days=1");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        Assert.False(resp.Headers.Contains("X-Data-Stale")); // fresh — không có cờ stale
        var body = await resp.Content.ReadFromJsonAsync<WeatherResponseDto>();
        Assert.NotNull(body);
        Assert.Equal("2026-07-04T14:15", body!.Current.Time);
        Assert.Single(body.Hourly);
    }

    [Fact]
    public async Task Weather_ParamSai_Tra400ProblemJson_QuaHttp()
    {
        await using var app = CreateApp(new FakeHttpMessageHandler(HttpStatusCode.OK, ValidForecastBody));
        using var client = app.CreateClient();

        var resp = await client.GetAsync("/api/weather?lat=999&lon=105.83");

        Assert.Equal(HttpStatusCode.BadRequest, resp.StatusCode);
        // ProblemDetails phải ra đúng content-type chuẩn qua pipeline thật
        Assert.Equal("application/problem+json", resp.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task Weather_UpstreamChet_Tra502ProblemJson_QuaHttp()
    {
        await using var app = CreateApp(new FakeHttpMessageHandler(HttpStatusCode.InternalServerError, "boom"));
        using var client = app.CreateClient();

        var resp = await client.GetAsync("/api/weather?lat=21.03&lon=105.83");

        Assert.Equal(HttpStatusCode.BadGateway, resp.StatusCode);
        Assert.Equal("application/problem+json", resp.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task ServeStale_EndToEnd_Co_XDataStale_Header()
    {
        // Lần 1 OK (cache), tua 11 phút qua TTL tươi forecast (10'), lần 2 upstream chết → 200 + X-Data-Stale
        var handler = new SequenceHttpMessageHandler(
            (HttpStatusCode.OK, ValidForecastBody),
            (HttpStatusCode.InternalServerError, "boom"));
        var time = new FakeTimeProvider(new DateTimeOffset(2026, 7, 4, 12, 0, 0, TimeSpan.Zero));
        await using var app = CreateApp(handler, time);
        using var client = app.CreateClient();

        var fresh = await client.GetAsync("/api/weather?lat=10.5&lon=106.5");
        Assert.Equal(HttpStatusCode.OK, fresh.StatusCode);

        time.Advance(TimeSpan.FromMinutes(11));
        var stale = await client.GetAsync("/api/weather?lat=10.5&lon=106.5");

        Assert.Equal(HttpStatusCode.OK, stale.StatusCode);
        Assert.True(stale.Headers.TryGetValues("X-Data-Stale", out var values));
        Assert.Equal("true", Assert.Single(values!));
    }

    [Fact]
    public async Task RateLimiter_Vuot100RequestMotPhut_Tra429()
    {
        await using var app = CreateApp(new FakeHttpMessageHandler(HttpStatusCode.OK, "{}"));
        using var client = app.CreateClient();
        client.DefaultRequestHeaders.Add("X-Forwarded-For", "203.0.113.7");

        HttpStatusCode last = HttpStatusCode.OK;
        var got429 = false;
        for (var i = 0; i < 101; i++)
        {
            var resp = await client.GetAsync("/api/health");
            last = resp.StatusCode;
            if (resp.StatusCode == HttpStatusCode.TooManyRequests)
            {
                got429 = true;
                break;
            }
        }

        Assert.True(got429, $"101 request cùng cửa sổ phải dính 429 — kết quả cuối: {(int)last}");
    }

    [Fact]
    public async Task RateLimiter_PhanBietTheoIp_XForwardedFor()
    {
        // Đây là hành vi PHẢI có để rate limit chạy đúng sau proxy Render:
        // ForwardedHeaders phải áp X-Forwarded-For vào RemoteIpAddress (Known* đã Clear = trust mọi proxy).
        // Nếu test này fail nghĩa là mọi user chung 1 bucket — chính nghi vấn từ production.
        await using var app = CreateApp(new FakeHttpMessageHandler(HttpStatusCode.OK, "{}"));

        using var clientA = app.CreateClient();
        clientA.DefaultRequestHeaders.Add("X-Forwarded-For", "198.51.100.1");
        for (var i = 0; i < 100; i++)
        {
            await clientA.GetAsync("/api/health"); // đốt sạch quota của IP A
        }
        var blocked = await clientA.GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);

        using var clientB = app.CreateClient();
        clientB.DefaultRequestHeaders.Add("X-Forwarded-For", "198.51.100.2");
        var other = await clientB.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, other.StatusCode); // IP khác — bucket khác, không bị vạ lây
    }

    [Fact]
    public async Task Geocode_KhongCoKetQua_Tra200MangRong_QuaHttp()
    {
        await using var app = CreateApp(new FakeHttpMessageHandler(HttpStatusCode.OK, "{}")); // Open-Meteo bỏ key results
        using var client = app.CreateClient();

        var resp = await client.GetAsync("/api/geocode?q=xyzabc");

        Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        var body = await resp.Content.ReadFromJsonAsync<List<GeocodeResultDto>>();
        Assert.NotNull(body);
        Assert.Empty(body!);
    }
}
