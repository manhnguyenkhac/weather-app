using System.Text.Json.Serialization;

namespace WeatherApp.Api.Models;

// ===== Response của backend cho client — shape khớp contract trong docs/API.md =====

public record CurrentWeatherDto(double Temperature, double WindSpeed, int WeatherCode);

public record DailyForecastDto(string Date, double TempMax, double TempMin, int WeatherCode);

public record WeatherResponseDto(CurrentWeatherDto Current, IReadOnlyList<DailyForecastDto> Daily);

// ===== Shape JSON từ Open-Meteo Forecast API =====
// Key upstream là snake_case (temperature_2m...) nên phải JsonPropertyName tường minh;
// khối "daily" là mảng-cột (mỗi field một mảng song song theo ngày).

public record OpenMeteoForecastResponseDto(
    [property: JsonPropertyName("current")] OpenMeteoCurrentDto? Current,
    [property: JsonPropertyName("daily")] OpenMeteoDailyDto? Daily);

public record OpenMeteoCurrentDto(
    [property: JsonPropertyName("temperature_2m")] double Temperature,
    [property: JsonPropertyName("wind_speed_10m")] double WindSpeed,
    [property: JsonPropertyName("weather_code")] int WeatherCode);

public record OpenMeteoDailyDto(
    [property: JsonPropertyName("time")] IReadOnlyList<string>? Time,
    [property: JsonPropertyName("temperature_2m_max")] IReadOnlyList<double>? TempMax,
    [property: JsonPropertyName("temperature_2m_min")] IReadOnlyList<double>? TempMin,
    [property: JsonPropertyName("weather_code")] IReadOnlyList<int>? WeatherCode);
