using WeatherApp.Api.Models;
using WeatherApp.Api.Services;

namespace WeatherApp.Api.Endpoints;

public static class GeocodeEndpoints
{
    public static void MapGeocodeEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/geocode");

        group.MapGet("/", HandleAsync);
    }

    // Tách handler thành method public để unit test gọi trực tiếp không cần host
    public static async Task<IResult> HandleAsync(string? q, int? count, OpenMeteoClient openMeteo, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(q))
        {
            return Results.Problem(
                detail: "Query param 'q' là bắt buộc và không được rỗng.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var resultCount = count ?? 5;
        if (resultCount is < 1 or > 100)
        {
            return Results.Problem(
                detail: "Query param 'count' phải là số nguyên trong khoảng 1..100.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var upstream = await openMeteo.SearchLocationsAsync(q.Trim(), resultCount, ct);
        if (upstream.Data is null)
        {
            return Results.Problem(
                detail: "Open-Meteo không phản hồi hoặc trả về lỗi.",
                statusCode: StatusCodes.Status502BadGateway);
        }

        // Open-Meteo bỏ key "results" khi không tìm thấy — contract của ta là mảng rỗng, vẫn 200
        var results = (upstream.Data.Results ?? [])
            .Select(r => new GeocodeResultDto(r.Name, r.Country ?? "", r.Latitude, r.Longitude))
            .ToList();

        return StaleOk.Ok(results, upstream.IsStale);
    }
}
