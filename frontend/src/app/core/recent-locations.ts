import { Injectable, signal } from '@angular/core';
import { GeocodeResult } from './weather-api';

const STORAGE_KEY = 'weather-app.recent';
const MAX_RECENT = 5;

/** Lịch sử địa điểm đã chọn — tối đa 5, mới nhất lên đầu, nhớ qua localStorage. */
@Injectable({ providedIn: 'root' })
export class RecentLocations {
  readonly locations = signal<GeocodeResult[]>(readInitial());

  add(city: GeocodeResult): void {
    this.locations.update((list) => {
      const rest = list.filter((c) => !sameLocation(c, city));
      return [city, ...rest].slice(0, MAX_RECENT);
    });
    persist(this.locations());
  }

  clear(): void {
    this.locations.set([]);
    persist([]);
  }
}

function sameLocation(a: GeocodeResult, b: GeocodeResult): boolean {
  return a.latitude === b.latitude && a.longitude === b.longitude;
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
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    // Dữ liệu cũ/hỏng trong storage không được phép làm vỡ app
    return parsed.filter(isGeocodeResult).slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

function isGeocodeResult(x: unknown): x is GeocodeResult {
  if (typeof x !== 'object' || x === null) {
    return false;
  }
  const c = x as Record<string, unknown>;
  return typeof c['name'] === 'string'
    && typeof c['country'] === 'string'
    && typeof c['latitude'] === 'number'
    && typeof c['longitude'] === 'number';
}
