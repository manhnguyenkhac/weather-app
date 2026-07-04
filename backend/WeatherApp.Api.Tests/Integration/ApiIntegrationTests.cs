using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Http;
using WeatherApp.Api.Models;
using WeatherApp.Api.Services;
using WeatherApp.Api.Tests.Fakes;

namespace WeatherApp.Api.Tests.Integration;

/// <summary>
/// Integration test qua HTTP pipeline THẬT (#83) — phủ lớp middleware mà unit test gọi thẳng
/// HandleAsync bỏ qua: routing, ForwardedHeaders, rate limiter, content-type ProblemDetails,
/// header X-Data-Stale, và WIRE JSON (tên field camelCase thật trên dây — thứ frontend phụ thuộc).
/// Upstream Open-Meteo bị thay bằng fake handler — không request nào ra internet.
/// Host test TẮT retry (IReadOnlyList&lt;TimeSpan&gt; rỗng qua DI) — không ngủ 250/750ms thật.
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

    /// <summary>
    /// Dựng cả app in-memory: thay primary handler của typed client, tắt retry,
    /// override TimeProvider và ngưỡng rate limit khi test cần.
    /// </summary>
    private static WebApplicationFactory<Program> CreateApp(
        HttpMessageHandler upstream,
        TimeProvider? time = null,
        int? rateLimitPermit = null)
    {
        return new WebApplicationFactory<Program>().WithWebHostBuilder(builder =>
        {
            if (rateLimitPermit is int permit)
            {
                // Ngưỡng nhỏ → burst kết thúc trong mili-giây, không đua với cửa sổ 60s
                // của FixedWindowRateLimiter (đồng hồ THẬT, FakeTimeProvider không điều khiển được).
                // UseSetting (không phải ConfigureAppConfiguration — source đó bị appsettings.json đè
                // trong minimal hosting) để giá trị test thắng.
                builder.UseSetting("RateLimit:PermitLimit", permit.ToString(CultureInfo.InvariantCulture));
            }

            builder.ConfigureServices(services =>
            {
                // Typed client AddHttpClient<OpenMeteoClient>() đăng ký theo tên class —
                // chèn PrimaryHandler giả vào đúng named client đó
                services.Configure<HttpClientFactoryOptions>(nameof(OpenMeteoClient), o =>
                    o.HttpMessageHandlerBuilderActions.Add(b => b.PrimaryHandler = upstream));

                // Tắt retry: OpenMeteoClient resolve optional param IReadOnlyList<TimeSpan> qua DI
                // (như unit test) — nếu không, mỗi test upstream-chết ngủ ~1s Task.Delay THẬT
                // trong khi giữ gate static, các test class song song bị chặn theo
                services.AddSingleton<IReadOnlyList<TimeSpan>>([]);

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

        // PIN WIRE JSON bằng JsonDocument thô — không round-trip qua DTO server
        // (ReadFromJsonAsync case-insensitive nên đổi naming policy vẫn xanh oan; docs/API.md
        // quy định camelCase, frontend chết nếu đổi). Mutation test đã chứng minh lỗ hổng này.
        using var doc = JsonDocument.Parse(await resp.Content.ReadAsStringAsync());
        var current = doc.RootElement.GetProperty("current"); // camelCase — GetProperty là case-SENSITIVE
        Assert.Equal(27.4, current.GetProperty("temperature").GetDouble());
        Assert.Equal(32.1, current.GetProperty("apparentTemperature").GetDouble());
        Assert.Equal("2026-07-04T14:15", current.GetProperty("time").GetString());
        var day0 = doc.RootElement.GetProperty("daily")[0];
        Assert.Equal("2026-07-04", day0.GetProperty("date").GetString());
        Assert.Equal(33.1, day0.GetProperty("tempMax").GetDouble());
        Assert.Equal(1, doc.RootElement.GetProperty("hourly").GetArrayLength());
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
    public async Task RateLimiter_200DungDenNguong_Roi429NgayRequestKeTiep()
    {
        // Pin ĐÚNG ngưỡng: permit=5 → request 1..5 phải 200 (không được chặn sớm hơn config),
        // request 6 phải 429. Burst 6 request in-memory xong trong mili-giây — không đua cửa sổ 60s.
        await using var app = CreateApp(new FakeHttpMessageHandler(HttpStatusCode.OK, "{}"), rateLimitPermit: 5);
        using var client = app.CreateClient();
        client.DefaultRequestHeaders.Add("X-Forwarded-For", "203.0.113.7");

        for (var i = 1; i <= 5; i++)
        {
            var resp = await client.GetAsync("/api/health");
            Assert.Equal(HttpStatusCode.OK, resp.StatusCode); // chặn sớm hơn ngưỡng = vi phạm contract
        }

        var blocked = await client.GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);
    }

    [Fact]
    public async Task RateLimiter_PhanBietTheoIp_XForwardedFor()
    {
        // Hành vi PHẢI có để rate limit chạy đúng sau proxy Render: ForwardedHeaders áp
        // X-Forwarded-For vào RemoteIpAddress (Known* đã Clear = trust mọi proxy).
        // Fail nghĩa là mọi user chung 1 bucket — chính nghi vấn từ production.
        await using var app = CreateApp(new FakeHttpMessageHandler(HttpStatusCode.OK, "{}"), rateLimitPermit: 5);

        using var clientA = app.CreateClient();
        clientA.DefaultRequestHeaders.Add("X-Forwarded-For", "198.51.100.1");
        for (var i = 1; i <= 5; i++)
        {
            var resp = await clientA.GetAsync("/api/health");
            Assert.Equal(HttpStatusCode.OK, resp.StatusCode);
        }
        var blocked = await clientA.GetAsync("/api/health");
        Assert.Equal(HttpStatusCode.TooManyRequests, blocked.StatusCode);

        using var clientB = app.CreateClient();
        clientB.DefaultRequestHeaders.Add("X-Forwarded-For", "198.51.100.2");
        var other = await clientB.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, other.StatusCode); // IP khác — bucket khác, không bị vạ lây
    }

    [Fact]
    public async Task RateLimit_MacDinhProduction_La100ReqMotPhut_KhopDocs()
    {
        // Pin giá trị appsettings.json khớp docs/API.md ("100 request/phút/IP") —
        // regression hạ ngưỡng khi refactor sẽ bị bắt ở đây
        await using var app = CreateApp(new FakeHttpMessageHandler(HttpStatusCode.OK, "{}"));
        var config = app.Services.GetRequiredService<IConfiguration>();

        Assert.Equal(100, config.GetValue<int>("RateLimit:PermitLimit"));
        Assert.Equal(60, config.GetValue<int>("RateLimit:WindowSeconds"));
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
