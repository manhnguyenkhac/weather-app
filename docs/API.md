# API Reference — weather-app backend

Backend .NET 10 Minimal API chạy tại `http://localhost:5155`. Frontend gọi qua đường dẫn tương đối `/api/*` (dev proxy qua `proxy.conf.json`). Backend chỉ có đúng 4 endpoint dưới đây.

> **BẮT BUỘC:** file này phải được cập nhật trong **cùng commit** với mọi thay đổi endpoint (thêm/sửa param, đổi shape response, đổi mã lỗi). Skill `dotnet10-endpoint` sẽ nhắc điều này.

## Tổng quan

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/api/weather` | Forecast thời tiết theo tọa độ (current + hourly + daily) |
| GET | `/api/geocode` | Tìm tọa độ địa điểm theo tên |
| GET | `/api/air-quality` | Chỉ số chất lượng không khí US AQI + chi tiết theo chất |
| GET | `/api/history` | Lịch sử 30 ngày qua + trung bình nhiệt độ 10 năm cùng thời điểm |

### Chống lỗi upstream (áp dụng cho cả 4 endpoint)

- **Retry có backoff**: mỗi lời gọi Open-Meteo thử tối đa 3 lần (delay ~250ms/750ms) khi gặp lỗi transient (timeout, network, 5xx, 429). Upstream trả 4xx hoặc body rác thì fail ngay, không retry.
- **Serve-stale**: response thành công được cache 2 tầng — TTL tươi (geocode 1h, forecast 10', AQI 30', history 12h) và stale horizon (geocode 24h, forecast/AQI 6h, history 48h). Hết TTL tươi mà upstream chết (sau retry) → trả **200 với bản cache cũ** kèm header **`X-Data-Stale: true`**.
- **502 chỉ trả khi** upstream lỗi **và** không còn bản cache nào trong stale horizon.
- **Rate limit (#74)**: 100 request/phút/IP (fixed window, đọc IP thật qua X-Forwarded-For). Vượt ngưỡng → **429 Too Many Requests**. Tọa độ lat/lon được backend làm tròn 2 số lẻ (~1.1km) trước khi gọi upstream — nhỏ hơn grid ~11km của Open-Meteo nên không đổi kết quả.

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
    "weatherCode": 3,
    "time": "2026-07-03T14:15"
  },
  "hourly": [
    { "time": "2026-07-03T14:00", "temperature": 30.0, "weatherCode": 3 },
    { "time": "2026-07-03T15:00", "temperature": 29.5, "weatherCode": 61 }
  ],
  "daily": [
    {
      "date": "2026-07-03", "tempMax": 33.1, "tempMin": 25.6, "weatherCode": 80,
      "sunrise": "2026-07-03T05:19", "sunset": "2026-07-03T18:43",
      "uvIndexMax": 8.5, "precipitationSum": 12.3, "precipitationProbabilityMax": 88
    }
  ]
}
```

- `current`: `temperature` (°C), `apparentTemperature` (RealFeel, °C), `humidity` (% độ ẩm tương đối), `windSpeed` (km/h), `weatherCode` (WMO), `time` (ISO local của city — mốc "bây giờ" để client định vị trong mảng `hourly`; upstream thiếu thì `""`).
- `hourly`: phủ TOÀN dải ngày yêu cầu — `24 × days` phần tử; mỗi phần tử `time` (ISO local `yyyy-MM-ddTHH:mm`), `temperature` (°C), `weatherCode`.
- `daily`: mỗi phần tử `date` (ISO `yyyy-MM-dd`), `tempMax`/`tempMin` (°C), `weatherCode` (WMO), `sunrise`/`sunset` (ISO local), `uvIndexMax`, `precipitationSum` (mm), `precipitationProbabilityMax` (%). Nhóm field chi tiết (sunrise → precipitationProbabilityMax) là bổ sung: upstream thiếu thì trả `""`/`0`, không gây 502.

### Mã lỗi

| Status | Khi nào |
|--------|---------|
| 200 | Thành công |
| 400 | Param sai/thiếu (`lat`/`lon` thiếu, không parse được, ngoài khoảng; `days` không phải int trong khoảng 1..16) |
| 502 | Open-Meteo upstream lỗi (không phản hồi hoặc trả non-2xx, sau retry) **và** không còn cache trong stale horizon — nếu còn thì trả 200 + header `X-Data-Stale: true` |

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
| 502 | Open-Meteo upstream lỗi (không phản hồi hoặc trả non-2xx, sau retry) **và** không còn cache trong stale horizon — nếu còn thì trả 200 + header `X-Data-Stale: true` |

Body lỗi theo dạng ProblemDetails, ví dụ 502:

```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.6.3",
  "title": "Bad Gateway",
  "status": 502,
  "detail": "Open-Meteo không phản hồi hoặc trả về lỗi."
}
```

## GET /api/air-quality

Chỉ số chất lượng không khí hiện tại (US AQI + nồng độ từng chất) và AQI theo giờ 24h tới. Backend gọi Open-Meteo `https://air-quality-api.open-meteo.com/v1/air-quality`.

### Query params

| Tên | Kiểu | Bắt buộc | Mặc định | Mô tả |
|------|--------|----------|----------|-------|
| `lat` | double | Có | — | Vĩ độ, khoảng -90..90 |
| `lon` | double | Có | — | Kinh độ, khoảng -180..180 |

### Response 200 (mẫu)

```json
{
  "current": {
    "usAqi": 132,
    "pm25": 48.2,
    "pm10": 87.0,
    "ozone": 61.0,
    "nitrogenDioxide": 34.0,
    "sulphurDioxide": 12.0,
    "carbonMonoxide": 640.0
  },
  "hourly": [
    { "time": "2026-07-04T10:00", "usAqi": 128 },
    { "time": "2026-07-04T11:00", "usAqi": 141 }
  ]
}
```

- `current`: `usAqi` (US AQI 0..500), các chất theo µg/m³ — chất nào upstream không có dữ liệu thì trả `0`.
- `hourly`: tối đa 24 giờ tới; giờ nào upstream thiếu `us_aqi` sẽ bị loại khỏi mảng (mảng có thể rỗng — không phải lỗi).

### Mã lỗi

| Status | Khi nào |
|--------|---------|
| 200 | Thành công |
| 400 | Param sai/thiếu (`lat`/`lon` thiếu, không parse được, ngoài khoảng, NaN) |
| 502 | Open-Meteo upstream lỗi (sau retry) và không còn cache trong stale horizon — nếu còn thì trả 200 + header `X-Data-Stale: true`; hoặc body 200 nhưng thiếu `us_aqi` hiện tại |

## GET /api/history

Lịch sử thời tiết: 30 ngày gần nhất có dữ liệu (max/min/mưa theo ngày) + trung bình nhiệt độ 10 năm cùng thời điểm (cửa sổ ±7 ngày quanh hôm nay). Backend gọi Open-Meteo Archive `https://archive-api.open-meteo.com/v1/archive` (1 lời gọi lấy 10 năm daily, cache 12h).

### Query params

| Tên | Kiểu | Bắt buộc | Mặc định | Mô tả |
|------|--------|----------|----------|-------|
| `lat` | double | Có | — | Vĩ độ, khoảng -90..90 |
| `lon` | double | Có | — | Kinh độ, khoảng -180..180 |

### Response 200 (mẫu)

```json
{
  "days": [
    { "date": "2026-06-04", "tempMax": 34.1, "tempMin": 26.2, "precipitation": 3.4 }
  ],
  "normal": { "tempMax": 33.2, "tempMin": 26.6 }
}
```

- `days`: 30 ngày gần nhất **có dữ liệu nhiệt độ** (archive trễ ~2-5 ngày, ngày null bị loại); `precipitation` (mm) thiếu thì trả `0`.
- `normal`: trung bình `tempMax`/`tempMin` của các ngày có day-of-year cách hôm nay ≤ ±7 trên toàn bộ 10 năm (xử lý wrap qua năm); không đủ dữ liệu thì `null` (không phải lỗi).

### Mã lỗi

| Status | Khi nào |
|--------|---------|
| 200 | Thành công |
| 400 | Param sai/thiếu (`lat`/`lon` thiếu, không parse được, ngoài khoảng, NaN) |
| 502 | Open-Meteo Archive lỗi (sau retry) và không còn cache trong stale horizon — nếu còn thì trả 200 + header `X-Data-Stale: true`; hoặc body 200 nhưng không có ngày nào đủ nhiệt độ |
