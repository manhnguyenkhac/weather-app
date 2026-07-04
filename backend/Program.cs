using System.Threading.RateLimiting;
using Microsoft.AspNetCore.HttpOverrides;
using WeatherApp.Api.Endpoints;
using WeatherApp.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Production (Render) thu stdout — JSON console để log query được (kind/status/latency).
// Dev giữ console mặc định cho dễ đọc.
if (builder.Environment.IsProduction())
{
    builder.Logging.ClearProviders();
    builder.Logging.AddJsonConsole(o => o.IncludeScopes = false);
}

// Fail-fast lúc boot: thiếu URL Open-Meteo thì mọi request sẽ 500 khó hiểu lúc runtime
foreach (var key in (string[])["OpenMeteo:GeocodingUrl", "OpenMeteo:ForecastUrl", "OpenMeteo:AirQualityUrl", "OpenMeteo:ArchiveUrl"])
{
    if (!Uri.IsWellFormedUriString(builder.Configuration[key], UriKind.Absolute))
    {
        throw new InvalidOperationException($"Thiếu hoặc sai cấu hình '{key}' trong appsettings.json — phải là URL tuyệt đối.");
    }
}

// SizeLimit + SetSize (trong OpenMeteoClient): chặn cache phình vô hạn trên Render free 512MB.
// Đơn vị là trọng số (history=100, forecast=10, aqi=5, geocode=1) — 2000 ≈ tối đa ~20 entry history.
builder.Services.AddMemoryCache(options => options.SizeLimit = 2000);
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddHttpClient<OpenMeteoClient>(client =>
{
    // Mặc định 100s × 3 attempts = treo ~5 phút/request khi upstream blackhole — cắt sớm,
    // serve-stale lo phần còn lại. Archive 10 năm đo thực tế ~4s nên 15s là dư.
    client.Timeout = TimeSpan.FromSeconds(15);
    // Request không UA từ IP datacenter dễ bị anti-bot upstream chấm điểm xấu
    client.DefaultRequestHeaders.UserAgent.ParseAdd("weather-app/1.0 (+https://github.com/manhnguyenkhac/weather-app)");
});

// Render đứng trước app như reverse proxy — phải đọc X-Forwarded-For thì RemoteIpAddress
// mới là IP user thật (nếu không, rate limit theo IP sẽ gom mọi user vào 1 bucket của LB)
builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

// Chống open-proxy: backend không auth mà đứng trước Open-Meteo — spam geocode chuỗi ngẫu nhiên
// (mỗi q một cache miss) có thể làm IP Render bị upstream chặn, hại TOÀN BỘ user.
// 100 req/phút/IP là rất rộng cho app này (mỗi lần đổi city ~3 call).
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 100,
                Window = TimeSpan.FromMinutes(1),
            }));
});

var app = builder.Build();

app.UseForwardedHeaders();
app.UseRateLimiter();

app.MapHealthEndpoints();
app.MapGeocodeEndpoints();
app.MapWeatherEndpoints();
app.MapAirQualityEndpoints();
app.MapHistoryEndpoints();

app.Run();

// Cho phép WebApplicationFactory tham chiếu khi viết integration test sau này
public partial class Program;
