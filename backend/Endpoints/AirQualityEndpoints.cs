using WeatherApp.Api.Models;
using WeatherApp.Api.Services;

namespace WeatherApp.Api.Endpoints;

public static class AirQualityEndpoints
{
    public static void MapAirQualityEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/air-quality");

        group.MapGet("/", HandleAsync);
    }

    // Tách handler thành method public để unit test gọi trực tiếp không cần host
    public static async Task<IResult> HandleAsync(double? lat, double? lon, OpenMeteoClient openMeteo, CancellationToken ct)
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

        var result = await openMeteo.GetAirQualityAsync(lat.Value, lon.Value, ct);
        var upstream = result.Data;

        // Thiếu block current hoặc thiếu us_aqi (headline) là upstream lỗi — không dựng được response đúng contract
        if (upstream?.Current?.UsAqi is null)
        {
            return Results.Problem(
                detail: "Open-Meteo không phản hồi hoặc trả về lỗi.",
                statusCode: StatusCodes.Status502BadGateway);
        }

        var c = upstream.Current;
        var current = new AirQualityCurrentDto(
            c.UsAqi.Value,
            c.Pm25 ?? 0,
            c.Pm10 ?? 0,
            c.Ozone ?? 0,
            c.NitrogenDioxide ?? 0,
            c.SulphurDioxide ?? 0,
            c.CarbonMonoxide ?? 0);

        // Hourly thiếu không phải lỗi chí mạng — trả mảng rỗng, UI tự ẩn dải theo giờ
        var hours = new List<AirQualityHourDto>();
        var hourly = upstream.Hourly;
        if (hourly?.Time is not null && hourly.UsAqi is not null)
        {
            // Zip theo độ dài NGẮN NHẤT; giờ nào us_aqi null thì bỏ qua
            var count = Math.Min(hourly.Time.Count, hourly.UsAqi.Count);
            for (var i = 0; i < count; i++)
            {
                if (hourly.UsAqi[i] is int aqi)
                {
                    hours.Add(new AirQualityHourDto(hourly.Time[i], aqi));
                }
            }
        }

        return StaleOk.Ok(new AirQualityResponseDto(current, hours), result.IsStale);
    }
}
