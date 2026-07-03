using WeatherApp.Api.Models;

namespace WeatherApp.Api.Endpoints;

public static class HealthEndpoints
{
    public static void MapHealthEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/health");

        group.MapGet("/", () => Results.Ok(new HealthResponse("ok")));
    }
}
