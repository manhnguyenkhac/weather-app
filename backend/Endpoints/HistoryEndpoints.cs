using System.Globalization;
using WeatherApp.Api.Models;
using WeatherApp.Api.Services;

namespace WeatherApp.Api.Endpoints;

public static class HistoryEndpoints
{
    // 30 ngày gần nhất cho biểu đồ; ±7 ngày quanh hôm nay (mỗi năm) cho trung bình 10 năm
    private const int ChartDays = 30;
    private const int NormalWindowDays = 7;

    public static void MapHistoryEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/history");

        group.MapGet("/", HandleAsync);
    }

    // Tách handler thành method public để unit test gọi trực tiếp không cần host
    public static async Task<IResult> HandleAsync(double? lat, double? lon, OpenMeteoClient openMeteo, TimeProvider time, CancellationToken ct)
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

        var result = await openMeteo.GetHistoryAsync(lat.Value, lon.Value, ct);
        var daily = result.Data?.Daily;

        if (daily?.Time is null || daily.TempMax is null || daily.TempMin is null)
        {
            return Results.Problem(
                detail: "Open-Meteo không phản hồi hoặc trả về lỗi.",
                statusCode: StatusCodes.Status502BadGateway);
        }

        // Zip theo độ dài NGẮN NHẤT; archive trễ vài ngày nên đuôi mảng có thể null — bỏ qua ngày thiếu nhiệt độ
        var count = Math.Min(daily.Time.Count, Math.Min(daily.TempMax.Count, daily.TempMin.Count));
        var valid = new List<HistoryDayDto>(count);
        for (var i = 0; i < count; i++)
        {
            if (daily.TempMax[i] is not double max || daily.TempMin[i] is not double min)
            {
                continue;
            }

            valid.Add(new HistoryDayDto(daily.Time[i], max, min, daily.PrecipitationSum?.ElementAtOrDefault(i) ?? 0));
        }

        if (valid.Count == 0)
        {
            // 200 nhưng không có ngày nào đủ nhiệt độ — coi như upstream lỗi, không dựng được response
            return Results.Problem(
                detail: "Open-Meteo không phản hồi hoặc trả về lỗi.",
                statusCode: StatusCodes.Status502BadGateway);
        }

        var days = valid.Count <= ChartDays ? valid : valid.GetRange(valid.Count - ChartDays, ChartDays);
        var normal = ComputeNormal(valid, time.GetUtcNow().UtcDateTime.Date);

        return StaleOk.Ok(new HistoryResponseDto(days, normal), result.IsStale);
    }

    /// <summary>
    /// Trung bình nhiệt độ của các ngày có day-of-year cách hôm nay ≤ ±7 (tính wrap qua năm)
    /// trên toàn bộ 10 năm dữ liệu — "mọi năm tầm này trời thế nào".
    /// </summary>
    private static HistoryNormalDto? ComputeNormal(List<HistoryDayDto> valid, DateTime today)
    {
        double sumMax = 0, sumMin = 0;
        var count = 0;

        foreach (var day in valid)
        {
            if (!DateTime.TryParseExact(day.Date, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            {
                continue;
            }

            var diff = Math.Abs(date.DayOfYear - today.DayOfYear);
            if (Math.Min(diff, 365 - diff) > NormalWindowDays)
            {
                continue;
            }

            sumMax += day.TempMax;
            sumMin += day.TempMin;
            count++;
        }

        if (count == 0)
        {
            return null;
        }

        return new HistoryNormalDto(
            Math.Round(sumMax / count, 1),
            Math.Round(sumMin / count, 1));
    }
}
