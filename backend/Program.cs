using WeatherApp.Api.Endpoints;
using WeatherApp.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Fail-fast lúc boot: thiếu URL Open-Meteo thì mọi request sẽ 500 khó hiểu lúc runtime
foreach (var key in (string[])["OpenMeteo:GeocodingUrl", "OpenMeteo:ForecastUrl", "OpenMeteo:AirQualityUrl"])
{
    if (!Uri.IsWellFormedUriString(builder.Configuration[key], UriKind.Absolute))
    {
        throw new InvalidOperationException($"Thiếu hoặc sai cấu hình '{key}' trong appsettings.json — phải là URL tuyệt đối.");
    }
}

builder.Services.AddMemoryCache();
builder.Services.AddHttpClient<OpenMeteoClient>();

var app = builder.Build();

app.MapHealthEndpoints();
app.MapGeocodeEndpoints();
app.MapWeatherEndpoints();
app.MapAirQualityEndpoints();

app.Run();

// Cho phép WebApplicationFactory tham chiếu khi viết integration test sau này
public partial class Program;
