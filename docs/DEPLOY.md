# Deploy — Vercel (frontend) + Render (backend)

Mô hình: browser → **Vercel** (Angular static + CDN) → rewrite `/api/*` → **Render** (.NET 10 API, Docker) → Open-Meteo.
Nhờ rewrite phía Vercel, browser luôn gọi cùng origin → **không cần CORS**, PWA offline cache hoạt động y nguyên.

Mọi config đã nằm sẵn trong repo: [`render.yaml`](../render.yaml) (Blueprint), [`backend/Dockerfile`](../backend/Dockerfile), [`frontend/vercel.json`](../frontend/vercel.json). Deploy tự động từ nhánh **`main`** — release bằng PR `develop → main`.

## Bước 1 — Backend lên Render (~5 phút, làm 1 lần)

1. Đăng ký https://render.com (đăng nhập bằng GitHub, authorize repo `weather-app`).
2. **New +** → **Blueprint** → chọn repo `manhnguyenkhac/weather-app` → Render tự đọc `render.yaml` → **Apply**.
3. Chờ build xong (~3-5 phút lần đầu). Kiểm tra: mở `https://weather-app-api.onrender.com/api/health` → `{"status":"ok"}`.

> ⚠️ Nếu tên `weather-app-api` đã bị người khác chiếm, Render sẽ gán tên khác (vd `weather-app-api-xxxx`).
> Khi đó sửa `destination` trong `frontend/vercel.json` theo URL thật rồi commit theo flow thường.

> 💤 Free tier ngủ sau 15 phút không có traffic — request đầu tiên sau khi ngủ mất ~30-60s. Chấp nhận được cho demo/research.

## Bước 2 — Frontend lên Vercel (~5 phút, làm 1 lần)

1. Đăng ký https://vercel.com (đăng nhập bằng GitHub).
2. **Add New → Project** → import repo `weather-app`.
3. Cấu hình project:
   - **Root Directory**: `frontend` (⚠️ bắt buộc — bấm Edit cạnh Root Directory)
   - **Production Branch**: `main` (Settings → Git, mặc định là main)
   - Build command / output đã có sẵn trong `frontend/vercel.json`, không cần sửa.
4. **Deploy** → xong sẽ có URL dạng `https://weather-app-xxx.vercel.app`.
5. Smoke test: mở URL → tìm "Hanoi" → chọn → thấy forecast. Mở `/api/health` trên chính URL Vercel → `{"status":"ok"}` (đi xuyên rewrite sang Render).

## Từ đó về sau

- **Release = PR `develop → main`** (tạo bằng `gh pr create --base main --head develop`). Merge xong: Render + Vercel tự build + deploy, không phải làm gì thêm.
- Rollback: Render → tab *Events* → *Rollback*; Vercel → *Deployments* → *Promote to Production* bản cũ.

## Ghi chú kỹ thuật

- Backend bind cổng theo biến `PORT` do Render cấp (fallback 8080 khi chạy container local: `docker run -p 8080:8080 <image>`).
- `IMemoryCache` an toàn vì Render free chạy đúng 1 instance.
- Không có secret nào cần cấu hình — Open-Meteo không cần API key, URL nằm trong `appsettings.json`.
