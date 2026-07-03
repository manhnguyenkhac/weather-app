# Conventions — weather-app

Quy ước bắt buộc cho toàn bộ code trong repo. Repo là monorepo gồm `/backend` (.NET 10 Minimal API, C#) và `/frontend` (Angular 22, TypeScript). Code backend/frontend chưa được viết — tài liệu này là chuẩn áp dụng cho code sắp viết.

## 1. Naming Frontend (Angular 22)

- **File kiểu mới, KHÔNG hậu tố `.component`**: `app.ts` / `app.html` / `app.css`, `weather-card.ts` / `weather-card.html` / `weather-card.css`. Không dùng `weather-card.component.ts`.
- **Tên file**: kebab-case theo tên component/service (`forecast-list.ts`, `city-search.ts`).
- **Class**: PascalCase, không hậu tố `Component` khi tên đã đủ nghĩa — file `weather-card.ts` chứa class `WeatherCard`.
- **Selector**: prefix `app-`, kebab-case — `app-weather-card`, `app-city-search`.
- **Signal**: đặt tên là danh từ mô tả dữ liệu — `city`, `forecast`, `unit`. Không prefix `$` hay hậu tố `Signal`.
- **Computed**: đặt tên mô tả giá trị dẫn xuất — `displayTemperature`, `hasResults`, `selectedCityLabel`.
- **Service**: naming kiểu mới, KHÔNG hậu tố `.service` — `weather-api.ts` chứa class `WeatherApi`. Không dùng `weather-api.service.ts`.
- **Quy tắc Angular 22 đi kèm** (bắt buộc): standalone component, `ChangeDetectionStrategy.OnPush` mặc định, zoneless, `inject()` thay constructor DI, `httpResource` cho mọi GET, Signal Forms, control flow `@if`/`@for`/`@switch`. CẤM `NgModule`. Không dùng RxJS khi signal làm được.

## 2. Naming Backend (.NET 10)

- **Type/method**: PascalCase — `GetForecastAsync`, `WeatherService`.
- **Record DTO**: hậu tố `Dto` hoặc `Response` — `ForecastResponse`, `GeocodeResultDto`. DTO luôn là `record`.
- **File endpoint theo domain**: `WeatherEndpoints.cs`, `GeocodeEndpoints.cs` — mỗi file một domain, đăng ký qua `MapGroup`.
- **Namespace**: `WeatherApp.Api.*` — ví dụ `WeatherApp.Api.Endpoints`, `WeatherApp.Api.Services`, `WeatherApp.Api.Models`.
- **Quy tắc .NET đi kèm**: `IHttpClientFactory` (typed/named client) cho gọi Open-Meteo, `CultureInfo.InvariantCulture` khi format số vào URL, URL ngoài đặt trong `appsettings.json`.

## 3. Cấu trúc folder

```text
weather-app/
├── backend/
│   ├── Program.cs               # bootstrap Minimal API, MapGroup theo domain
│   ├── Endpoints/
│   │   ├── WeatherEndpoints.cs  # GET /api/weather
│   │   └── GeocodeEndpoints.cs  # GET /api/geocode
│   ├── Services/
│   │   └── OpenMeteoClient.cs   # typed client gọi Open-Meteo
│   ├── Models/
│   │   ├── WeatherDtos.cs       # record DTO cho /api/weather
│   │   └── GeocodeDtos.cs       # record DTO cho /api/geocode
│   └── appsettings.json         # URL Open-Meteo (forecast + geocoding)
└── frontend/
    ├── proxy.conf.json          # proxy /api -> http://localhost:5155
    └── src/app/
        ├── core/                # service dùng chung
        │   └── weather-api.ts
        ├── features/weather/    # component theo feature
        │   ├── city-search.ts / .html / .css
        │   ├── weather-card.ts / .html / .css
        │   └── forecast-list.ts / .html / .css
        └── shared/              # pipe, directive, UI nhỏ tái sử dụng
```

## 4. Git flow

- **Vai trò nhánh**: `main` chỉ chứa base — KHÔNG commit/merge/push trực tiếp (hook `.claude/hooks/git-guard.sh` chặn). `develop` là nhánh tích hợp, mọi PR merge vào đây.
- **Issue trước, code sau**: mỗi feature/module tạo GitHub issue trước (`gh issue create --title "..." --body "..."`). Số issue dùng để đặt tên nhánh và link commit.
- **Branch**: tạo `feature/<số issue>-<slug>` từ `develop` — ví dụ `feature/2-geocode-endpoint`, `feature/5-city-search-ui`.
- **Commit link issue**: message kết thúc bằng `(#N)` — ví dụ `feat(backend): add GET /api/weather endpoint (#4)`.
- **Review gate trước khi push** (hook cưỡng chế): chạy `/code-review`, sửa hết 🔴 Critical và 🟡 Warning, rồi ghi dấu đạt `git rev-parse HEAD > .claude/.review-passed` — thiếu dấu đúng SHA của HEAD thì `git push` bị chặn.
- **PR vào `develop`**, merge bằng **squash merge**. `main` chỉ nhận merge release từ `develop` khi user quyết định.
- **Trước khi mở PR**: chạy test và pass toàn bộ — `cd frontend && ng test` và `cd backend && dotnet test`.
- **Conventional Commits**: `type(scope): mô tả`. Các type cho phép:
  - `feat` — tính năng mới: `feat(backend): add GET /api/weather endpoint`
  - `fix` — sửa bug: `fix(frontend): handle empty geocode result`
  - `chore` — việc lặt vặt, tooling: `chore: update .gitignore`
  - `docs` — tài liệu: `docs: add API section to README`
  - `test` — thêm/sửa test: `test(backend): cover 400 on missing lat`
  - `refactor` — đổi cấu trúc không đổi hành vi: `refactor(frontend): extract forecast-list component`
- Scope gợi ý: `backend`, `frontend`, hoặc bỏ trống khi ảnh hưởng toàn repo.
- **Ngôn ngữ commit**: title theo Conventional Commits (tiếng Anh). Body viết tiếng Anh hoặc tiếng Việt đều được — nhưng nếu tiếng Việt thì BẮT BUỘC có dấu đầy đủ (không viết "chua co dau" khó đọc).
