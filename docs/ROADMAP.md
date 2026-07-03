# Roadmap — weather-app

## Trạng thái hiện tại (2026-07)

- Hạ tầng docs / agents / skills: **đã xong**.
- Code backend (.NET 10) và frontend (Angular 22): **chưa bắt đầu** — backlog dưới đây là thứ tự triển khai.

## Backlog

Thứ tự ưu tiên từ trên xuống. Mỗi mục: mô tả + tiêu chí xong (DoD).

### MVP

- [x] Scaffold backend .NET 10 Minimal API trong `/backend` (#3) — DoD: `cd backend && dotnet run --urls http://localhost:5155` chạy được (health check `GET /api/health`), `dotnet test WeatherApp.Api.Tests` pass, cấu trúc folder đúng `docs/CONVENTIONS.md`.
- [x] Scaffold frontend Angular 22 trong `/frontend` + `proxy.conf.json` (#7) — DoD: `cd frontend && ng serve` chạy tại http://localhost:4200, request `/api/*` được proxy sang port 5155 (verify GET /api/health qua 4200 trả 200), `ng test` pass (vitest).
- [x] Endpoint `GET /api/geocode?q={string}&count={int, mặc định 5}` gọi Open-Meteo Geocoding (#9) — DoD: trả JSON danh sách city, 400 khi thiếu/sai `q`, 502 khi upstream lỗi, có test (16 test pass, verify sống với Open-Meteo).
- [x] Endpoint `GET /api/weather?lat={double}&lon={double}&days={int, mặc định 7}` gọi Open-Meteo Forecast (#11) — DoD: trả forecast theo `days`, 400 khi param sai/thiếu, 502 khi upstream lỗi, có test (33 test pass, verify sống với Open-Meteo).
- [x] UI tìm city + hiển thị forecast (#13) — DoD: nhập tên city gọi `/api/geocode`, chọn kết quả gọi `/api/weather` và render forecast 7 ngày; dùng httpResource + signals, có test component (12 test pass, verify sống chuỗi UI → proxy → backend → Open-Meteo).

### Nâng cao

- [x] Cache backend bằng `IMemoryCache` cho response Open-Meteo (#15) — DoD: request trùng (lat/lon/days hoặc q/count) trong TTL không gọi lại upstream, có test verify cache hit (38 test pass; verify sống: 5 request → 2 lần gọi upstream, latency 907ms → 2ms).
- [x] Toggle °C/°F trên UI (#17) — DoD: chuyển đổi đơn vị tức thì bằng computed signal, lựa chọn được giữ trong `localStorage` (19 test pass, có test DOM 30°C → 86°F).
- [x] Giao diện kiểu AccuWeather (#19, user yêu cầu ngoài backlog) — header tối + search dropdown, hero current (RealFeel®, độ ẩm), dải hourly 24h cuộn ngang, daily dạng card; `/api/weather` mở rộng `apparentTemperature`/`humidity`/`hourly` (63 test pass 2 phía, verify sống).
- [ ] PWA + offline — DoD: app cài được (installable), forecast xem gần nhất hiển thị được khi mất mạng.

### Vận hành

- [x] CI chạy test (#21) — DoD: pipeline chạy `dotnet test` + `ng test` trên mọi PR vào `develop` (GitHub Actions, 2 job song song), PR fail test không merge được (required status checks backend + frontend trên branch protection của `develop`).
- [ ] Deploy — DoD: backend + frontend deploy tự động từ `main`, có URL public truy cập được.
