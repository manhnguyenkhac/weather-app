using System.Text.Json.Serialization;

namespace WeatherApp.Api.Models;

// ===== Response của backend cho client — shape khớp contract trong docs/API.md =====

public record CurrentWeatherDto(
    double Temperature,
    double ApparentTemperature,
    int Humidity,
    double WindSpeed,
    int WeatherCode,
    string Time);

public record HourlyForecastDto(string Time, double Temperature, int WeatherCode);

public record DailyForecastDto(
    string Date,
    double TempMax,
    double TempMin,
    int WeatherCode,
    string Sunrise,
    string Sunset,
    double UvIndexMax,
    double PrecipitationSum,
    int PrecipitationProbabilityMax);

public record WeatherResponseDto(
    CurrentWeatherDto Current,
    IReadOnlyList<HourlyForecastDto> Hourly,
    IReadOnlyList<DailyForecastDto> Daily);

// ===== Shape JSON từ Open-Meteo Forecast API =====
// Key upstream là snake_case (temperature_2m...) nên phải JsonPropertyName tường minh;
// khối "hourly"/"daily" là mảng-cột (mỗi field một mảng song song).

public record OpenMeteoForecastResponseDto(
    [property: JsonPropertyName("current")] OpenMeteoCurrentDto? Current,
    [property: JsonPropertyName("hourly")] OpenMeteoHourlyDto? Hourly,
    [property: JsonPropertyName("daily")] OpenMeteoDailyDto? Daily);

public record OpenMeteoCurrentDto(
    [property: JsonPropertyName("temperature_2m")] double Temperature,
    [property: JsonPropertyName("apparent_temperature")] double ApparentTemperature,
    [property: JsonPropertyName("relative_humidity_2m")] int Humidity,
    [property: JsonPropertyName("wind_speed_10m")] double WindSpeed,
    [property: JsonPropertyName("weather_code")] int WeatherCode,
    // Open-Meteo luôn kèm "time" (ISO local của city) trong block current — frontend cần để
    // biết "bây giờ" nằm đâu trong mảng hourly (hourly bắt đầu từ 00:00, không phải từ giờ hiện tại)
    [property: JsonPropertyName("time")] string? Time = null);

public record OpenMeteoHourlyDto(
    [property: JsonPropertyName("time")] IReadOnlyList<string>? Time,
    [property: JsonPropertyName("temperature_2m")] IReadOnlyList<double>? Temperature,
    [property: JsonPropertyName("weather_code")] IReadOnlyList<int>? WeatherCode);

public record OpenMeteoDailyDto(
    [property: JsonPropertyName("time")] IReadOnlyList<string>? Time,
    [property: JsonPropertyName("temperature_2m_max")] IReadOnlyList<double>? TempMax,
    [property: JsonPropertyName("temperature_2m_min")] IReadOnlyList<double>? TempMin,
    [property: JsonPropertyName("weather_code")] IReadOnlyList<int>? WeatherCode,
    // Các field bổ sung (chi tiết ngày) — có thể thiếu/null từng phần tử, endpoint fallback mặc định
    [property: JsonPropertyName("sunrise")] IReadOnlyList<string?>? Sunrise,
    [property: JsonPropertyName("sunset")] IReadOnlyList<string?>? Sunset,
    [property: JsonPropertyName("uv_index_max")] IReadOnlyList<double?>? UvIndexMax,
    [property: JsonPropertyName("precipitation_sum")] IReadOnlyList<double?>? PrecipitationSum,
    [property: JsonPropertyName("precipitation_probability_max")] IReadOnlyList<int?>? PrecipitationProbabilityMax);
