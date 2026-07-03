---
name: angular22-patterns
description: Quy ước Angular 22 cho frontend weather-app. Use when tạo/sửa component, form, service, template, hoặc gọi API endpoint (/api/weather, /api/geocode) từ phía frontend Angular — áp dụng standalone component, signals, httpResource, Signal Forms, OnPush, naming file kiểu mới.
---

# Angular 22 Patterns

Frontend nằm ở `frontend/` (Angular 22, TypeScript, zoneless). Chạy: `cd frontend && ng serve` (http://localhost:4200, proxy `/api` sang backend 5155 qua `proxy.conf.json`). Test: `cd frontend && ng test`.

Quy tắc cứng: standalone component (CẤM NgModule), `ChangeDetectionStrategy.OnPush` mặc định, state bằng `signal()`/`computed()`, **mọi GET đi qua `httpResource()`**, form bằng Signal Forms, control flow `@if/@for/@switch`, DI bằng `inject()` (không constructor DI), không dùng RxJS khi signal làm được.

## (a) Template component chuẩn

`frontend/src/app/features/weather/weather-card.ts`:

```ts
import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';

// Shape khớp đúng contract trong docs/API.md
export interface CurrentWeather {
  temperature: number;
  windSpeed: number;
  weatherCode: number;
}

export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
}

export interface WeatherResponse {
  current: CurrentWeather;
  daily: DailyForecast[];
}

@Component({
  selector: 'app-weather-card',
  templateUrl: './weather-card.html',
  styleUrl: './weather-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherCard {
  // State là signal — đổi giá trị bằng .set()/.update()
  readonly lat = signal(21.0278);   // Hà Nội mặc định
  readonly lon = signal(105.8342);
  readonly days = signal(7);

  // httpResource: URL là hàm reactive — lat/lon/days đổi thì tự re-fetch,
  // KHÔNG cần subscribe/RxJS. Luôn gọi đường dẫn tương đối /api/... (đi qua proxy).
  readonly weather = httpResource<WeatherResponse>(
    () => `/api/weather?lat=${this.lat()}&lon=${this.lon()}&days=${this.days()}`
  );

  // Dẫn xuất bằng computed, không tính trong template
  readonly today = computed(() => this.weather.value()?.daily?.[0] ?? null);
}
```

`frontend/src/app/features/weather/weather-card.html`:

```html
@if (weather.isLoading()) {
  <p>Đang tải…</p>
} @else if (weather.error()) {
  <p class="error">Không lấy được dữ liệu thời tiết.</p>
} @else if (weather.hasValue()) {
  <ul>
    @for (d of weather.value().daily; track d.date) {
      <li>{{ d.date }}: {{ d.tempMin }}° – {{ d.tempMax }}°</li>
    }
  </ul>
}
```

Ghi chú:
- `httpResource` chỉ dùng cho GET. Không có POST/PUT trong app này (backend chỉ có 2 GET endpoint).
- Muốn "chưa fetch khi thiếu input": trả `undefined` từ hàm URL, resource sẽ ở trạng thái idle.
- Cần service? Dùng `inject(MyService)` trong field initializer, không khai báo constructor.

## (b) Signal Form — form tìm city (gọi /api/geocode)

`frontend/src/app/features/weather/city-search.ts`:

```ts
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { form, required, minLength, Control } from '@angular/forms/signals';

@Component({
  selector: 'app-city-search',
  templateUrl: './city-search.html',
  styleUrl: './city-search.css',
  imports: [Control],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CitySearch {
  readonly model = signal({ city: '' });

  readonly searchForm = form(this.model, (p) => {
    required(p.city, { message: 'Nhập tên city' });
    minLength(p.city, 2, { message: 'Tối thiểu 2 ký tự' });
  });

  // Chỉ fetch sau khi submit — giữ query đã submit trong signal riêng
  readonly submitted = signal<string | undefined>(undefined);

  readonly results = httpResource<GeocodeResult[]>(() => {
    const q = this.submitted();
    return q ? `/api/geocode?q=${encodeURIComponent(q)}&count=5` : undefined;
  });

  search(): void {
    if (this.searchForm().valid()) {
      this.submitted.set(this.model().city.trim());
    }
  }
}

// Shape khớp đúng contract trong docs/API.md (dùng latitude/longitude,
// khi gọi tiếp /api/weather thì map sang query param lat/lon)
export interface GeocodeResult {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}
```

`city-search.html`:

```html
<form (submit)="$event.preventDefault(); search()">
  <input [control]="searchForm.city" placeholder="Tên thành phố" />
  <button type="submit" [disabled]="searchForm().invalid()">Tìm</button>
</form>
```

## (c) Naming file kiểu mới

Không dùng hậu tố `.component`/`.service` kiểu cũ:

| Đúng | Sai |
|---|---|
| `app.ts` / `app.html` / `app.css` | `app.component.ts` |
| `weather-card.ts` | `weather-card.component.ts` |
| `city-search.ts` | `city-search.component.ts` |
| `weather-api.ts` (service) | `weather-api.service.ts` |
| `weather-card.spec.ts` (test) | `weather-card.component.spec.ts` |

Tên class cũng bỏ hậu tố: `WeatherCard`, không phải `WeatherCardComponent`.

## (d) Checklist trước khi xong

- [ ] Không có `NgModule` nào được tạo/import.
- [ ] Component có `changeDetection: ChangeDetectionStrategy.OnPush`.
- [ ] Mọi GET dùng `httpResource()`; không có `HttpClient.get().subscribe()` hay RxJS thừa.
- [ ] State/derive bằng `signal()`/`computed()`; form bằng Signal Forms.
- [ ] Template dùng `@if/@for/@switch` (không `*ngIf/*ngFor`).
- [ ] DI bằng `inject()`, không constructor DI.
- [ ] Tên file kiểu mới (không hậu tố `.component`), URL API là đường dẫn tương đối `/api/...`.
- [ ] `cd frontend && ng test` pass.
