using WeatherApp.Api.Endpoints;
using WeatherApp.Api.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddHttpClient<OpenMeteoClient>();

var app = builder.Build();

app.MapHealthEndpoints();
app.MapGeocodeEndpoints();

app.Run();

// Cho phép WebApplicationFactory tham chiếu khi viết integration test sau này
public partial class Program;
