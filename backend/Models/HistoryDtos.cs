using System.Text.Json.Serialization;

namespace WeatherApp.Api.Models;

// ===== Response của backend cho client — shape khớp contract trong docs/API.md =====

public record HistoryDayDto(string Date, double TempMax, double TempMin, double Precipitation);

/// <summary>Trung bình 10 năm cùng thời điểm (cửa sổ ±7 ngày quanh hôm nay).</summary>
public record HistoryNormalDto(double TempMax, double TempMin);

public record HistoryResponseDto(IReadOnlyList<HistoryDayDto> Days, HistoryNormalDto? Normal);

// ===== Shape JSON từ Open-Meteo Archive API =====
// Archive trễ ~2-5 ngày nên các phần tử cuối có thể null — dùng double? và bỏ qua khi build response.

public record OpenMeteoArchiveResponseDto(
    [property: JsonPropertyName("daily")] OpenMeteoArchiveDailyDto? Daily);

public record OpenMeteoArchiveDailyDto(
    [property: JsonPropertyName("time")] IReadOnlyList<string>? Time,
    [property: JsonPropertyName("temperature_2m_max")] IReadOnlyList<double?>? TempMax,
    [property: JsonPropertyName("temperature_2m_min")] IReadOnlyList<double?>? TempMin,
    [property: JsonPropertyName("precipitation_sum")] IReadOnlyList<double?>? PrecipitationSum);
