import { Location } from '@angular/common';
import { Injectable, effect, inject } from '@angular/core';
import { GeocodeResult, WeatherApi } from './weather-api';

/**
 * URL theo thành phố (#69) — dạng /city/<tên>[,<nước>]@<lat>,<lon>
 * vd: /city/H%C3%A0-N%E1%BB%99i,Vietnam@21.0245,105.8412
 * Dùng Location trực tiếp (không cần Router/outlet — app một view duy nhất).
 */

/** GeocodeResult → path. Khoảng trắng trong tên thành '-' cho URL dễ đọc. */
export function cityToPath(city: GeocodeResult): string {
  const name = encodeURIComponent(city.name.trim().replace(/\s+/g, '-'));
  const country = city.country ? `,${encodeURIComponent(city.country.trim().replace(/\s+/g, '-'))}` : '';
  return `/city/${name}${country}@${city.latitude},${city.longitude}`;
}

/** Path → GeocodeResult; không khớp dạng hoặc tọa độ sai → null. */
export function pathToCity(path: string): GeocodeResult | null {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const match = /^\/city\/([^@]+)@(-?[0-9.]+),(-?[0-9.]+)$/.exec(normalized);
  if (!match) return null;

  const lat = Number(match[2]);
  const lon = Number(match[3]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    return null;
  }

  const [rawName, rawCountry = ''] = match[1].split(',', 2);
  // decodeURIComponent ném URIError với chuỗi % hỏng — URL rác không được làm app chết
  let name: string;
  let country: string;
  try {
    const decode = (s: string) => decodeURIComponent(s).replace(/-/g, ' ').trim();
    name = decode(rawName);
    country = decode(rawCountry);
  } catch {
    return null;
  }
  if (!name) return null;

  return { name, country, latitude: lat, longitude: lon };
}

@Injectable({ providedIn: 'root' })
export class CityUrl {
  private readonly location = inject(Location);
  private readonly api = inject(WeatherApi);

  constructor() {
    // Deep link: mở app bằng URL /city/... là chọn luôn thành phố đó
    const initial = pathToCity(this.location.path());
    if (initial) {
      this.api.selectCity(initial);
    }

    // Back/forward của browser → chọn lại theo URL; về '/' là về trang chủ
    this.location.subscribe((event) => {
      const city = pathToCity(event.url ?? '');
      if (city) {
        if (!this.sameAsSelected(city)) {
          this.api.selectCity(city);
        }
      } else {
        this.api.selectedCity.set(undefined);
      }
    });

    // City đổi (search, recent, bản đồ, so sánh…) → đẩy URL + title; URL đã đúng thì thôi (chặn vòng lặp)
    effect(() => {
      const city = this.api.selectedCity();
      if (!city) return;
      const path = cityToPath(city);
      if (this.location.path() !== path) {
        this.location.go(path);
      }
      document.title = `${city.name} — weather-app`;
    });
  }

  private sameAsSelected(city: GeocodeResult): boolean {
    const current = this.api.selectedCity();
    return !!current && current.latitude === city.latitude && current.longitude === city.longitude;
  }
}
