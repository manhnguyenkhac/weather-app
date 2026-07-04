import { Injectable, signal } from '@angular/core';
import { GeocodeResult } from './weather-api';

const STORAGE_KEY = 'weather-app.compare';
export const MAX_COMPARE = 3;

/** Danh sách city đem so sánh — tối đa 3, nhớ qua localStorage. */
@Injectable({ providedIn: 'root' })
export class CompareList {
  readonly cities = signal<GeocodeResult[]>(readInitial());

  /** Thêm city; trùng nhãn thì THAY entry cũ (tọa độ có thể đã đổi — "Vị trí của tôi" sau khi
   *  di chuyển phải cập nhật, không giữ tọa độ đóng băng #74). Trả về true nếu danh sách đổi. */
  add(city: GeocodeResult): boolean {
    const existing = this.cities().find((c) => sameEntry(c, city));
    if (existing) {
      if (existing.latitude === city.latitude && existing.longitude === city.longitude) {
        return false; // trùng hệt — không có gì để cập nhật
      }
      this.cities.update((list) => list.map((c) => (sameEntry(c, city) ? city : c)));
      persist(this.cities());
      return true;
    }

    if (this.cities().length >= MAX_COMPARE) {
      return false;
    }
    this.cities.update((list) => [...list, city]);
    persist(this.cities());
    return true;
  }

  remove(city: GeocodeResult): void {
    this.cities.update((list) => list.filter((c) => !sameEntry(c, city)));
    persist(this.cities());
  }

  has(city: GeocodeResult): boolean {
    return this.cities().some((c) => sameEntry(c, city));
  }
}

// Dedup theo nhãn hiển thị như RecentLocations — 2 entry cùng tên là một
function sameEntry(a: GeocodeResult, b: GeocodeResult): boolean {
  return (a.name === b.name && a.country === b.country)
    || (a.latitude === b.latitude && a.longitude === b.longitude);
}

function persist(list: GeocodeResult[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // localStorage bị chặn — không nhớ được nhưng app vẫn chạy
  }
}

function readInitial(): GeocodeResult[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isGeocodeResult).slice(0, MAX_COMPARE);
  } catch {
    return [];
  }
}

function isGeocodeResult(x: unknown): x is GeocodeResult {
  if (typeof x !== 'object' || x === null) return false;
  const c = x as Record<string, unknown>;
  return typeof c['name'] === 'string'
    && typeof c['country'] === 'string'
    && typeof c['latitude'] === 'number'
    && typeof c['longitude'] === 'number';
}
