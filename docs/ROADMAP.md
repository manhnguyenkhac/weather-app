# Roadmap — weather-app

## Trạng thái hiện tại (2026-07)

- Hạ tầng docs / agents / skills: **đã xong**.
- Code backend (.NET 10) và frontend (Angular 22): **chưa bắt đầu** — backlog dưới đây là thứ tự triển khai.

## Backlog

Thứ tự ưu tiên từ trên xuống. Mỗi mục: mô tả + tiêu chí xong (DoD).

### MVP

- [ ] Scaffold backend .NET 10 Minimal API trong `/backend` — DoD: `cd backend && dotnet run --urls http://localhost:5155` chạy được, `dotnet test` pass, cấu trúc folder đúng `docs/CONVENTIONS.md`.
- [ ] Scaffold frontend Angular 22 trong `/frontend` + `proxy.conf.json` — DoD: `cd frontend && ng serve` chạy tại http://localhost:4200, request `/api/*` được proxy sang port 5155, `ng test` pass.
- [ ] Endpoint `GET /api/geocode?q={string}&count={int, mặc định 5}` gọi Open-Meteo Geocoding — DoD: trả JSON danh sách city, 400 khi thiếu/sai `q`, 502 khi upstream lỗi, có test.
- [ ] Endpoint `GET /api/weather?lat={double}&lon={double}&days={int, mặc định 7}` gọi Open-Meteo Forecast — DoD: trả forecast theo `days`, 400 khi param sai/thiếu, 502 khi upstream lỗi, có test.
- [ ] UI tìm city + hiển thị forecast — DoD: nhập tên city gọi `/api/geocode`, chọn kết quả gọi `/api/weather` và render forecast 7 ngày; dùng httpResource + signals, có test component.

### Nâng cao

- [ ] Cache backend bằng `IMemoryCache` cho response Open-Meteo — DoD: request trùng (lat/lon/days hoặc q/count) trong TTL không gọi lại upstream, có test verify cache hit.
- [ ] Toggle °C/°F trên UI — DoD: chuyển đổi đơn vị tức thì bằng computed signal, lựa chọn được giữ trong `localStorage`.
- [ ] PWA + offline — DoD: app cài được (installable), forecast xem gần nhất hiển thị được khi mất mạng.

### Vận hành

- [ ] CI chạy test — DoD: pipeline chạy `dotnet test` + `ng test` trên mọi PR vào `main`, PR fail test không merge được.
- [ ] Deploy — DoD: backend + frontend deploy tự động từ `main`, có URL public truy cập được.
