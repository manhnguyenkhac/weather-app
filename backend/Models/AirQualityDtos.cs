using System.Text.Json.Serialization;

namespace WeatherApp.Api.Models;

// ===== Response của backend cho client — shape khớp contract trong docs/API.md =====

public record AirQualityCurrentDto(
    int UsAqi,
    double Pm25,
    double Pm10,
    double Ozone,
    double NitrogenDioxide,
    double SulphurDioxide,
    double CarbonMonoxide);

public record AirQualityHourDto(string Time, int UsAqi);

public record AirQualityResponseDto(
    AirQualityCurrentDto Current,
    IReadOnlyList<AirQualityHourDto> Hourly);

// ===== Shape JSON từ Open-Meteo Air Quality API =====
// Field upstream có thể null tại một số vị trí/thời điểm — khai nullable hết,
// endpoint quyết định: thiếu us_aqi là 502, các chất thiếu thì về 0.

public record OpenMeteoAirQualityResponseDto(
    [property: JsonPropertyName("current")] OpenMeteoAirQualityCurrentDto? Current,
    [property: JsonPropertyName("hourly")] OpenMeteoAirQualityHourlyDto? Hourly);

public record OpenMeteoAirQualityCurrentDto(
    [property: JsonPropertyName("us_aqi")] int? UsAqi,
    [property: JsonPropertyName("pm2_5")] double? Pm25,
    [property: JsonPropertyName("pm10")] double? Pm10,
    [property: JsonPropertyName("ozone")] double? Ozone,
    [property: JsonPropertyName("nitrogen_dioxide")] double? NitrogenDioxide,
    [property: JsonPropertyName("sulphur_dioxide")] double? SulphurDioxide,
    [property: JsonPropertyName("carbon_monoxide")] double? CarbonMonoxide);

public record OpenMeteoAirQualityHourlyDto(
    [property: JsonPropertyName("time")] IReadOnlyList<string>? Time,
    [property: JsonPropertyName("us_aqi")] IReadOnlyList<int?>? UsAqi);
