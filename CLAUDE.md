# CLAUDE.md — weather-app

## Tổng quan

Monorepo ứng dụng thời tiết: `/backend` (.NET 10 Minimal API, C#) và `/frontend` (Angular 22, TypeScript).
Dữ liệu thời tiết lấy từ **Open-Meteo** (miễn phí, không cần API key) — backend proxy sang Open-Meteo, frontend chỉ gọi backend qua `/api`.

**Tech stack:**
- Frontend: Angular 22 — standalone component, signals, httpResource, Signal Forms, `ChangeDetectionStrategy.OnPush` mặc định, zoneless.
- Backend: .NET 10 Minimal API — MapGroup theo domain, DTO record, IHttpClientFactory.
- Provider: Open-Meteo (forecast: `https://api.open-meteo.com/v1/forecast`, geocoding: `https://geocoding-api.open-meteo.com/v1/search`).

## Lệnh thường dùng

```bash
# Chạy backend (port 5155)
cd backend && dotnet run --urls http://localhost:5155

# Chạy frontend (http://localhost:4200, proxy /api sang 5155 qua proxy.conf.json)
cd frontend && ng serve

# Test
cd frontend && ng test
cd backend && dotnet test
```

## Rules Frontend

- Chỉ dùng **standalone component** — CẤM NgModule.
- DI bằng `inject()`, không dùng constructor injection.
- State dùng **signal** thay biến thường (`signal()`, `computed()`, `linkedSignal()`).
- Mọi HTTP GET dùng **httpResource** (không tự gọi HttpClient thủ công cho GET).
- Form dùng **Signal Forms**.
- Control flow mới trong template: `@if` / `@for` / `@switch` (không dùng `*ngIf`, `*ngFor`).
- Không dùng RxJS khi signal làm được.
- `ChangeDetectionStrategy.OnPush` mặc định cho mọi component; app chạy zoneless.
- Naming file kiểu mới: `app.ts` / `app.html` / `app.css` — KHÔNG dùng hậu tố `.component`.

## Rules Backend

- Minimal API + `MapGroup` theo domain (vd: `MapGroup("/api/weather")`), không dùng Controller.
- DTO là `record`.
- Gọi HTTP ra ngoài qua **IHttpClientFactory** (typed/named client), không `new HttpClient()`.
- Format số vào URL (lat/lon) bắt buộc dùng `CultureInfo.InvariantCulture`.
- URL ngoài (Open-Meteo) đặt trong `appsettings.json`, không hardcode trong code.
- Chỉ có 2 endpoint:
  - `GET /api/weather?lat={double}&lon={double}&days={int, tùy chọn, mặc định 7}`
  - `GET /api/geocode?q={string}&count={int, tùy chọn, mặc định 5}`
- Mã lỗi: `400` (param sai/thiếu), `502` (Open-Meteo upstream lỗi).

## Workflow

1. Đọc `docs/ARCHITECTURE.md` trước khi thêm feature mới.
2. Chạy test (`ng test`, `dotnet test`) trước khi báo hoàn thành.
3. Git flow: `main` chỉ chứa base (hook chặn commit/merge/push trên main). Nhánh tích hợp là `develop`. Mỗi feature: tạo GitHub issue (`gh issue create`), tạo nhánh `feature/<số issue>-<slug>` từ `develop`, commit theo **Conventional Commits** kèm link issue: `feat(scope): mô tả (#N)`. PR vào `develop`.
4. **Review gate trước khi push**: chạy `/code-review`, sửa hết Critical/Warning, rồi ghi dấu đạt: `git rev-parse HEAD > .claude/.review-passed`. Hook `git-guard.sh` chặn push khi HEAD chưa có dấu review.

Tài liệu tham chiếu:
- `docs/ARCHITECTURE.md` — kiến trúc tổng thể, luồng dữ liệu.
- `docs/API.md` — spec chi tiết 2 endpoint backend.
- `docs/CONVENTIONS.md` — coding convention frontend/backend, git.
- `docs/ROADMAP.md` — kế hoạch feature.

## CẤM

- Tự thêm package/dependency khi chưa hỏi.
- Sửa file trong `docs/` khi không được yêu cầu — NGOẠI TRỪ cập nhật `docs/API.md` / `docs/ROADMAP.md` theo quy trình bắt buộc của skill `dotnet10-endpoint` và `new-feature`.
- Commit/merge/push thẳng vào `main` — mọi việc đi qua `feature/<issue>-<slug>` → PR vào `develop`.
- Push khi chưa qua review gate (hook sẽ chặn — đừng tìm cách vòng qua).
