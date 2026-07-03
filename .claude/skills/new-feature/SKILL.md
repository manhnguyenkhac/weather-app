---
name: new-feature
description: Pipeline chuẩn thêm feature/tính năng mới end-to-end cho weather-app. Use when user yêu cầu thêm feature, tính năng, chức năng mới đụng cả backend lẫn frontend (endpoint mới + component mới) — đọc docs, đề xuất plan, DỪNG chờ user approve, rồi mới code, test, cập nhật docs, commit.
---

# Pipeline thêm feature mới (end-to-end)

Áp dụng cho mọi yêu cầu dạng "thêm tính năng X" trong repo weather-app (monorepo: `backend/` .NET 10 Minimal API, `frontend/` Angular 22). Làm đúng thứ tự 7 bước, KHÔNG nhảy cóc.

## Bước 1 — Đọc docs trước

Đọc đủ 3 file trước khi đề xuất bất cứ gì:

- `docs/ARCHITECTURE.md` — kiến trúc, quy ước 2 phía
- `docs/API.md` — các endpoint hiện có (hiện chỉ có `GET /api/weather` và `GET /api/geocode`)
- `docs/ROADMAP.md` — feature đã lên kế hoạch, tránh trùng/lệch hướng

## Bước 2 — Đề xuất plan ngắn

Trình bày plan gọn (bullet, không lan man), gồm:

- File sẽ đụng tới (backend + frontend, đường dẫn cụ thể)
- Endpoint mới/thay đổi (method, route, param, mã lỗi) — nếu có
- Component/signal/form mới phía Angular — nếu có
- Docs sẽ phải cập nhật ở bước 6

## Bước 3 — DỪNG LẠI, chờ user APPROVE

**BẮT BUỘC dừng sau khi trình plan. KHÔNG viết code, KHÔNG tạo file, KHÔNG tạo branch trước khi user đồng ý rõ ràng.** Nếu user yêu cầu chỉnh plan → sửa plan, trình lại, tiếp tục chờ. Chỉ sang bước 4 khi có approve.

## Bước 4 — Tạo issue + branch + Code

- Tạo GitHub issue cho feature: `gh issue create --title "feat: <tên feature>" --body "<plan đã approve>"` → lấy số issue `N`.
- Tạo branch `feature/<N>-<slug>` từ `develop` (KHÔNG từ main — main chỉ chứa base, hook chặn).
- Backend: theo skill `dotnet10-endpoint` (record DTO, MapGroup, 400/502, IHttpClientFactory, InvariantCulture).
- Frontend: theo skill `angular22-patterns` (standalone, OnPush, signals, httpResource, Signal Forms, naming kiểu mới).
- Nếu phù hợp, giao việc cho subagent `backend-dev` / `frontend-dev` làm song song từng phía.

## Bước 5 — Chạy toàn bộ test 2 phía

```
cd backend && dotnet test
cd frontend && ng test
```

Cả hai phải pass. Fail thì sửa xong mới đi tiếp. Muốn xem chạy thật: backend `cd backend && dotnet run --urls http://localhost:5155`, frontend `cd frontend && ng serve` (http://localhost:4200).

## Bước 6 — Cập nhật docs liên quan

- `docs/API.md` — nếu thêm/đổi endpoint, param, response, mã lỗi (cùng commit với code).
- `docs/ROADMAP.md` — tick mục vừa làm xong.
- `docs/ARCHITECTURE.md` — chỉ khi thay đổi kiến trúc/quy ước.

## Bước 7 — Commit + Review gate + Push + PR

- Commit theo Conventional Commits, kết thúc message bằng link issue `(#N)` — ví dụ `feat(weather): them endpoint hourly forecast (#4)`.
- **Review gate**: chạy `/code-review`, sửa hết Critical/Warning (commit fix nếu có), rồi ghi dấu đạt: `git rev-parse HEAD > .claude/.review-passed`. Hook chặn push khi thiếu dấu này.
- Push branch `feature/<N>-<slug>`, mở PR vào `develop` (`gh pr create --base develop`), body ghi `Closes #N`. KHÔNG đụng main.

## Tóm tắt luồng

```
đọc docs → plan → [CHỜ APPROVE] → issue (#N) → branch feature/<N>-<slug> từ develop
→ code → test 2 phía → cập nhật docs → commit (#N) → /code-review sạch → marker → push → PR vào develop
```
