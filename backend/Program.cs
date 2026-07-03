using WeatherApp.Api.Endpoints;

var builder = WebApplication.CreateBuilder(args);

var app = builder.Build();

app.MapHealthEndpoints();

app.Run();

// Cho phép WebApplicationFactory tham chiếu khi viết integration test sau này
public partial class Program;
