# API Reference — weather-app backend

Backend .NET 10 Minimal API chạy tại `http://localhost:5155`. Frontend gọi qua đường dẫn tương đối `/api/*` (dev proxy qua `proxy.conf.json`). Backend chỉ có đúng 2 endpoint dưới đây.

> **BẮT BUỘC:** file này phải được cập nhật trong **cùng commit** với mọi thay đổi endpoint (thêm/sửa param, đổi shape response, đổi mã lỗi). Skill `dotnet10-endpoint` sẽ nhắc điều này.

## Tổng quan

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/weather` | Forecast thời tiết theo tọa độ (current + daily) |
| GET | `/api/geocode` | Tìm tọa độ địa điểm theo tên |

## GET /api/weather

Lấy thời tiết hiện tại, dự báo theo giờ (24h tới) và dự báo theo ngày cho một tọa độ. Backend gọi Open-Meteo `https://api.open-meteo.com/v1/forecast`.

### Query params

| Tên | Kiểu | Bắt buộc | Mặc định | Mô tả |
|------|--------|----------|----------|-------|
| `lat` | double | Có | — | Vĩ độ, khoảng -90..90 |
| `lon` | double | Có | — | Kinh độ, khoảng -180..180 |
| `days` | int | Không | `7` | Số ngày forecast, khoảng 1..16 (giới hạn `forecast_days` của Open-Meteo) |

### Response 200 (mẫu)

```json
{
  "current": {
    "temperature": 27.4,
    "apparentTemperature": 32.1,
    "humidity": 78,
    "windSpeed": 11.2,
    "weatherCode": 3
  },
  "hourly": [
    { "time": "2026-07-03T14:00", "temperature": 30.0, "weatherCode": 3 },
    { "time": "2026-07-03T15:00", "temperature": 29.5, "weatherCode": 61 }
  ],
  "daily": [
    { "date": "2026-07-03", "tempMax": 33.1, "tempMin": 25.6, "weatherCode": 80 },
    { "date": "2026-07-04", "tempMax": 32.0, "tempMin": 25.1, "weatherCode": 61 }
  ]
}
```

- `current`: `temperature` (°C), `apparentTemperature` (RealFeel, °C), `humidity` (% độ ẩm tương đối), `windSpeed` (km/h), `weatherCode` (WMO).
- `hourly`: 24 giờ tới (`forecast_hours=24`), mỗi phần tử `time` (ISO local `yyyy-MM-ddTHH:mm`), `temperature` (°C), `weatherCode`.
- `daily`: mỗi phần tử `date` (ISO `yyyy-MM-dd`), `tempMax` / `tempMin` (°C), `weatherCode` (WMO weather code từ Open-Meteo).

### Mã lỗi

| Status | Khi nào |
|--------|---------|
| 200 | Thành công |
| 400 | Param sai/thiếu (`lat`/`lon` thiếu, không parse được, ngoài khoảng; `days` không phải int trong khoảng 1..16) |
| 502 | Open-Meteo upstream lỗi (không phản hồi hoặc trả non-2xx) |

Body lỗi theo dạng ProblemDetails, ví dụ 400:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "Bad Request",
  "status": 400,
  "detail": "Query param 'lat' là bắt buộc và phải là số trong khoảng -90..90."
}
```

## GET /api/geocode

Tìm danh sách địa điểm khớp với tên truy vấn. Backend gọi Open-Meteo `https://geocoding-api.open-meteo.com/v1/search`.

### Query params

| Tên | Kiểu | Bắt buộc | Mặc định | Mô tả |
|------|--------|----------|----------|-------|
| `q` | string | Có | — | Tên địa điểm cần tìm (không rỗng) |
| `count` | int | Không | `5` | Số kết quả tối đa, khoảng 1..100 (giới hạn của Open-Meteo Geocoding) |

### Response 200 (mẫu)

```json
[
  { "name": "Hanoi", "country": "Vietnam", "latitude": 21.0245, "longitude": 105.8412 },
  { "name": "Ha Noi", "country": "Vietnam", "latitude": 21.0333, "longitude": 105.85 }
]
```

Không tìm thấy kết quả nào vẫn trả 200 với mảng rỗng `[]`.

### Mã lỗi

| Status | Khi nào |
|--------|---------|
| 200 | Thành công (kể cả mảng rỗng) |
| 400 | Param sai/thiếu (`q` thiếu/rỗng; `count` không phải int trong khoảng 1..100) |
| 502 | Open-Meteo upstream lỗi (không phản hồi hoặc trả non-2xx) |

Body lỗi theo dạng ProblemDetails, ví dụ 502:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.6.3",
  "title": "Bad Gateway",
  "status": 502,
  "detail": "Open-Meteo không phản hồi hoặc trả về lỗi."
}
```
