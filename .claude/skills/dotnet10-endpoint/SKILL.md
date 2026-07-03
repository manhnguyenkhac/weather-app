---
name: dotnet10-endpoint
description: Quy trình thêm/sửa endpoint API backend .NET 10 Minimal API của weather-app. Use when thêm/sửa endpoint, route, DTO, validation, hoặc code gọi Open-Meteo phía backend — record DTO, MapGroup theo domain, trả 400/502 đúng chuẩn, IHttpClientFactory, CultureInfo.InvariantCulture, cập nhật docs/API.md.
---

# Thêm/sửa endpoint .NET 10 Minimal API

Backend nằm ở `backend/` (.NET 10 Minimal API, C#). Chạy: `cd backend && dotnet run --urls http://localhost:5155`. Test: `cd backend && dotnet test WeatherApp.Api.Tests`.

Backend hiện chỉ có 2 endpoint: `GET /api/weather?lat&lon&days` và `GET /api/geocode?q&count`. Mã lỗi chuẩn: **400** khi query param sai/thiếu, **502** khi Open-Meteo (upstream) lỗi. URL ngoài (Open-Meteo) đặt trong `appsettings.json`, KHÔNG hardcode trong code.

## Quy trình 6 bước

### 1. Khai báo record DTO

DTO luôn là `record`, đặt trong `backend/Models/` (ví dụ `backend/Models/WeatherDtos.cs`). Shape serialize ra JSON phải khớp đúng contract trong `docs/API.md`:

```csharp
public record CurrentDto(double Temperature, double WindSpeed, int WeatherCode);
public record DailyForecastDto(string Date, double TempMax, double TempMin, int WeatherCode);
public record WeatherResponseDto(CurrentDto Current, IReadOnlyList<DailyForecastDto> Daily);
```

### 2. Tạo/mở rộng MapGroup theo domain

Mỗi domain 1 group, ví dụ `app.MapGroup("/api/weather")`, `app.MapGroup("/api/geocode")`. Endpoint mới cùng domain thì thêm vào group sẵn có, không tạo route rời rạc trong `Program.cs`.

### 3. Validate query param → 400

Nhận param nullable, kiểm tra range, trả `Results.Problem(detail: ..., statusCode: 400)` (body ProblemDetails, khớp `docs/API.md`) kèm `detail` rõ ràng khi sai/thiếu.

### 4. Gọi Open-Meteo qua typed client (IHttpClientFactory)

Typed client `OpenMeteoClient` đặt ở `backend/Services/OpenMeteoClient.cs`, đăng ký trong `Program.cs`:

```csharp
builder.Services.AddHttpClient<OpenMeteoClient>();
```

URL Open-Meteo đọc từ `appsettings.json` (URL đầy đủ, không hardcode trong code):

```json
{
  "OpenMeteo": {
    "ForecastUrl": "https://api.open-meteo.com/v1/forecast",
    "GeocodingUrl": "https://geocoding-api.open-meteo.com/v1/search"
  }
}
```

**BẮT BUỘC `CultureInfo.InvariantCulture`** khi format số (lat/lon) vào URL — nếu không, culture như `vi-VN` sẽ sinh `21,0278` (dấu phẩy) và Open-Meteo trả lỗi.

### 5. Upstream lỗi → 502

Bắt `HttpRequestException` / status không thành công / body null → trả `Results.Problem(detail: "Open-Meteo không phản hồi hoặc trả về lỗi.", statusCode: StatusCodes.Status502BadGateway)` (body ProblemDetails, khớp `docs/API.md`). Không để exception upstream leak ra thành 500.

### 6. Cập nhật docs/API.md — BẮT BUỘC, cùng commit

Mọi thay đổi endpoint (thêm/sửa param, response shape, mã lỗi) phải cập nhật `docs/API.md` trong **cùng một commit** với code. Commit theo Conventional Commits, ví dụ `feat(weather): them param days cho /api/weather`.

## Ví dụ hoàn chỉnh — GET /api/weather

`backend/Services/OpenMeteoClient.cs`:

```csharp
using System.Globalization;

public class OpenMeteoClient(HttpClient http, IConfiguration config)
{
    public async Task<OpenMeteoForecastDto?> GetForecastAsync(double lat, double lon, int days)
    {
        // (4) InvariantCulture khi nhét số vào URL
        var url = string.Create(CultureInfo.InvariantCulture,
            $"{config["OpenMeteo:ForecastUrl"]}?latitude={lat}&longitude={lon}" +
            $"&current=temperature_2m,wind_speed_10m,weather_code" +
            $"&daily=temperature_2m_max,temperature_2m_min,weather_code&forecast_days={days}&timezone=auto");

        using var resp = await http.GetAsync(url);
        if (!resp.IsSuccessStatusCode) return null;
        return await resp.Content.ReadFromJsonAsync<OpenMeteoForecastDto>();
    }
}
```

`backend/Endpoints/WeatherEndpoints.cs`:

```csharp
public static class WeatherEndpoints
{
    public static void MapWeatherEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/weather");

        group.MapGet("/", async (double? lat, double? lon, int? days,
            OpenMeteoClient openMeteo) =>
        {
            // (3) Validate → 400 (ProblemDetails)
            if (lat is null or < -90 or > 90)
                return Results.Problem(detail: "lat bắt buộc, trong khoảng [-90, 90]", statusCode: 400);
            if (lon is null or < -180 or > 180)
                return Results.Problem(detail: "lon bắt buộc, trong khoảng [-180, 180]", statusCode: 400);
            var d = days ?? 7;
            if (d is < 1 or > 16)
                return Results.Problem(detail: "days phải trong khoảng [1, 16]", statusCode: 400);

            // (4) Gọi Open-Meteo qua typed client
            try
            {
                var upstream = await openMeteo.GetForecastAsync(lat.Value, lon.Value, d);
                if (upstream is null)
                    return Results.Problem(detail: "Open-Meteo không phản hồi hoặc trả về lỗi.",
                        statusCode: StatusCodes.Status502BadGateway); // (5)

                return Results.Ok(ToResponse(upstream)); // (1) map sang WeatherResponseDto
            }
            catch (HttpRequestException)
            {
                return Results.Problem(detail: "Open-Meteo không phản hồi hoặc trả về lỗi.",
                    statusCode: StatusCodes.Status502BadGateway); // (5)
            }
        });
    }
}
```

`Program.cs` gọi `app.MapWeatherEndpoints();` sau khi build app.

## Checklist trước khi xong

- [ ] DTO là `record`, đặt trong `backend/Models/`, shape khớp `docs/API.md`.
- [ ] Endpoint nằm trong `MapGroup` đúng domain, file trong `backend/Endpoints/`.
- [ ] Param sai/thiếu → 400; upstream lỗi → 502 (không 500) — body lỗi ProblemDetails (`Results.Problem`).
- [ ] Gọi HTTP qua typed client `OpenMeteoClient` (`IHttpClientFactory`), URL Open-Meteo từ `appsettings.json`.
- [ ] Số vào URL format bằng `CultureInfo.InvariantCulture`.
- [ ] `docs/API.md` cập nhật cùng commit; `cd backend && dotnet test WeatherApp.Api.Tests` pass.
