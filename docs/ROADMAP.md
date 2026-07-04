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
- [x] Bản đồ radar mưa (#51, user chốt kèm duyệt package leaflet) — Leaflet + OSM + RainViewer (miễn phí không key): radar thật 2h qua + nowcast 30 phút, Play tua thời gian, click bản đồ chọn vị trí xem thời tiết + AQI; panel thu gọn mặc định, lazy-init; ADR-003 (76 test frontend).
- [x] Keep-alive Render (#44) — GitHub Actions cron ping /api/health mỗi 10 phút, hết cảnh chờ ~50s đánh thức.
- [x] Chi tiết từng ngày (#46) — daily thêm mọc/lặn, UV max (nhãn WHO), tổng mưa + xác suất; hourly phủ cả dải ngày; bấm card ngày xổ chi tiết + hourly riêng ngày đó.
- [x] Biểu đồ nhiệt độ (#48) — SVG tự vẽ: line 24h (grid chìm, hover crosshair + tooltip, label cực trị) + dải min-max theo ngày; hình học tách hàm thuần có test.
- [x] Định vị tự động (#41, user chốt từ đề xuất) — nút "Thời tiết chỗ tôi" dùng Geolocation API, city ảo "Vị trí của tôi" (không reverse geocoding — Open-Meteo không hỗ trợ), lỗi quyền/timeout có message tiếng Việt; dedup lịch sử theo nhãn (54 test frontend).
- [x] Chỉ số chất lượng không khí AQI (#35, user yêu cầu ngoài backlog) — endpoint `GET /api/air-quality` (Open-Meteo Air Quality, cache 30'), panel gauge 210° 6 mức + verdict/lời khuyên sức khỏe + 6 tile chất ô nhiễm (% ngưỡng WHO) + AQI theo giờ; mockup được duyệt trước qua artifact, bộ màu qua validator CVD (54 test backend + 48 test frontend).
- [x] Địa điểm gần đây + sidebar (#23, user yêu cầu ngoài backlog) — lịch sử ≤5 city trong localStorage, card kèm nhiệt độ + RealFeel sống ở trang chủ; sidebar ☰ trượt phải (cài đặt °C/°F, link cuộn section, chọn nhanh/xóa lịch sử) (38 test frontend pass, review đa góc 4 finder + verify).
- [x] Cảnh báo thời tiết xấu (#54, user yêu cầu) — `buildAlerts` hàm thuần suy từ forecast + AQI sẵn có (không gọi thêm API): dông 24h tới, mưa to/rất to (≥25/50mm), nắng nóng ≥37°C, rét ≤10°C, UV ≥8, gió ≥40km/h, AQI >150; banner danger/warning trên đầu trang, danger nổi trước.
- [x] So sánh thành phố (#56, user yêu cầu) — panel thu gọn, tối đa 3 city cạnh nhau (nhiệt độ, RealFeel, cao/thấp, mưa hôm nay, AQI chip), thêm từ city đang xem/lịch sử, dedup theo nhãn hoặc tọa độ, giữ trong localStorage.
- [x] Đa ngôn ngữ VI/EN (#58, user yêu cầu) — service `I18n` tự viết (signal `lang` + `t(key, params)`, dict ~70 key, không thêm package), nút VI/EN trên header + segmented control trong sidebar, giữ trong localStorage; toàn bộ UI/cảnh báo/AQI/thứ trong tuần dịch theo lang (101 test frontend).
- [x] PWA + offline (#27) — DoD: app cài được (manifest + service worker trong production build), forecast xem gần nhất hiển thị được khi mất mạng (SW dataGroup `/api/**` strategy freshness, timeout 5s → cache, maxAge 1d). Package thêm: @angular/pwa (user đã duyệt).

- [x] Backend chống lỗi upstream (#61, user chốt từ đề xuất sau vụ 502 production 2026-07-04) — retry có backoff (3 lần, chỉ lỗi transient: timeout/network/5xx/429), serve-stale 2 tầng (TTL tươi như cũ + stale horizon geocode 24h, forecast/AQI 6h): upstream chết mà còn bản cũ thì trả 200 + header `X-Data-Stale: true`, 502 chỉ khi không còn gì; TimeProvider built-in, không thêm package (65 test backend).

- [x] Tổng rà soát UI (#64, user yêu cầu từ screenshot production) — design token trong `styles.css` (màu/bo góc/bóng/padding panel, 14 file CSS dùng `var()`), card địa điểm & so sánh đều kích thước (host `height:100%` + min-height, tên 1 dòng ellipsis + tooltip, dòng country luôn chiếm chỗ), pill VI/°C cùng size, h3 section đồng nhịp, media query mobile đầu tiên (topbar, hero, padding).

- [x] Dark mode (#67, user chốt từ đề xuất) — service `ThemePreference` (signal theme light/dark/auto, mặc định auto theo prefers-color-scheme, localStorage `weather-app.theme`, effect gắn `data-theme` lên `<html>`); bộ dark token override trong `styles.css` (nhờ #64 chỉ 1 chỗ); segmented Giao diện ☀️/🌙/🖥️ trong sidebar (i18n); script inline trong index.html chống chớp nền sáng (106 test frontend).

- [x] URL theo thành phố (#69, user chốt từ đề xuất) — `/city/<tên>[,<nước>]@<lat>,<lon>`: deep link mở đúng city, share được, back/forward hoạt động, `document.title` theo city; dùng `Location` (không cần Router/outlet — app một view); vercel.json thêm SPA fallback → index.html (113 test frontend).

- [x] Lịch sử & xu hướng (#71, user chốt từ đề xuất) — endpoint `GET /api/history` gọi Open-Meteo Archive (1 lời gọi 10 năm daily, cache 12h/stale 48h, ngày null bị loại, TimeProvider test tua được): 30 ngày gần nhất + trung bình 10 năm cùng thời điểm (±7 ngày, wrap qua năm); panel 'Xu hướng & lịch sử' thu gọn, fetch lazy khi mở: verdict nóng/lạnh hơn trung bình, chart SVG 2 line max/min, tổng mưa 30 ngày, i18n + °C/°F (72 test backend + 117 frontend; smoke sống: Hà Nội normal 33.2°/26.6°, cache hit 4ms).

- [x] Hardening sau tổng review (#74, user yêu cầu review toàn source + deploy; 4 reviewer song song tìm 4 Critical/17 Warning) — Backend: cache key history ổn định (không xoay theo ngày UTC), MemoryCache SizeLimit + làm tròn tọa độ 2 số lẻ, single-flight chống stampede, HttpClient timeout 15s + User-Agent, 429 không retry, rate limit 100 req/phút/IP + ForwardedHeaders, contract thêm `current.time`. Frontend: cửa sổ "24h tới" trượt theo giờ hiện tại (alerts + chart — trước đó quét hôm nay từ 00:00), city-url giữ dấu gạch thật, compare cập nhật tọa độ "Vị trí của tôi", chặn callback định vị muộn, cảnh báo theo °C/°F, panel History/AQI không mất state khi đổi city, map click không rác recent/không giật pan, AQI lỗi hiện "—", gauge + tile OSM hợp dark mode, chart hỗ trợ touch. Deploy: ngsw navigationUrls (PWA offline deep link), tách dataGroup history, Docker USER app, vercel security headers, CI chạy cả PR vào main, keepalive báo outage thật (74 test backend + 121 frontend).

- [x] Observability (#80, user chốt từ đề xuất sau tổng review) — structured logging mọi lời gọi Open-Meteo (`kind` + status + latency ms) qua `ILogger`: fetch thật Information, serve-stale/fail Warning, cache hit Debug; JSON console trong Production (Render thu stdout, query `State.Kind`/`State.Ms`); không log lat/lon/query; noise `IHttpClientFactory` hạ Warning. Biến sự cố upstream từ "mò 1 tiếng" thành "đọc log 1 phút" (78 test backend; smoke sống: "Open-Meteo forecast: 200 trong 941ms").

### Vận hành

- [x] CI chạy test (#21) — DoD: pipeline chạy `dotnet test` + `ng test` trên mọi PR vào `develop` (GitHub Actions, 2 job song song), PR fail test không merge được (required status checks backend + frontend trên branch protection của `develop`).
- [x] Deploy (#29) — DoD đạt đủ: backend Render (https://weather-app-api-55c4.onrender.com) + frontend Vercel (https://weather-app-phi-weld-95.vercel.app), auto-deploy từ `main`, smoke test toàn chuỗi từ internet: trang chủ + health + geocode + weather + manifest + service worker đều 200.
