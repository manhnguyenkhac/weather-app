using WeatherApp.Api.Models;
using WeatherApp.Api.Services;

namespace WeatherApp.Api.Endpoints;

public static class WeatherEndpoints
{
    public static void MapWeatherEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/weather");

        group.MapGet("/", HandleAsync);
    }

    // Tách handler thành method public để unit test gọi trực tiếp không cần host
    public static async Task<IResult> HandleAsync(double? lat, double? lon, int? days, OpenMeteoClient openMeteo, CancellationToken ct)
    {
        // Lưu ý NaN: fail mọi phép so sánh nên phải check riêng (double.TryParse("NaN") thành công)
        if (lat is null or < -90 or > 90 || double.IsNaN(lat.Value))
        {
            return Results.Problem(
                detail: "Query param 'lat' là bắt buộc và phải là số trong khoảng -90..90.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        if (lon is null or < -180 or > 180 || double.IsNaN(lon.Value))
        {
            return Results.Problem(
                detail: "Query param 'lon' là bắt buộc và phải là số trong khoảng -180..180.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var forecastDays = days ?? 7;
        if (forecastDays is < 1 or > 16)
        {
            return Results.Problem(
                detail: "Query param 'days' phải là số nguyên trong khoảng 1..16.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var upstream = await openMeteo.GetForecastAsync(lat.Value, lon.Value, forecastDays, ct);

        // Thiếu hẳn block current/daily trong body 200 cũng là upstream lỗi — không thể dựng response đúng contract
        if (upstream?.Current is null || upstream.Daily?.Time is null
            || upstream.Daily.TempMax is null || upstream.Daily.TempMin is null || upstream.Daily.WeatherCode is null)
        {
            return Results.Problem(
                detail: "Open-Meteo không phản hồi hoặc trả về lỗi.",
                statusCode: StatusCodes.Status502BadGateway);
        }

        var daily = upstream.Daily;
        // Zip theo độ dài NGẮN NHẤT để mảng cột lệch nhau (upstream bất thường) không gây IndexOutOfRange
        var dayCount = Math.Min(
            Math.Min(daily.Time.Count, daily.TempMax.Count),
            Math.Min(daily.TempMin.Count, daily.WeatherCode.Count));

        var forecast = new List<DailyForecastDto>(dayCount);
        for (var i = 0; i < dayCount; i++)
        {
            forecast.Add(new DailyForecastDto(daily.Time[i], daily.TempMax[i], daily.TempMin[i], daily.WeatherCode[i]));
        }

        var current = new CurrentWeatherDto(upstream.Current.Temperature, upstream.Current.WindSpeed, upstream.Current.WeatherCode);

        return Results.Ok(new WeatherResponseDto(current, forecast));
    }
}
