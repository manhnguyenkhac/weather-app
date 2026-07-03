namespace WeatherApp.Api.Models;

// Response của backend cho client — shape khớp contract trong docs/API.md
public record GeocodeResultDto(string Name, string Country, double Latitude, double Longitude);

// Shape JSON từ Open-Meteo Geocoding API (chỉ khai báo các field cần dùng).
// Open-Meteo bỏ hẳn key "results" khi không có kết quả nào.
public record OpenMeteoGeocodeResponse(IReadOnlyList<OpenMeteoGeocodeResult>? Results);

public record OpenMeteoGeocodeResult(string Name, string? Country, double Latitude, double Longitude);
