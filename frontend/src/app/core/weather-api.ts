import { Injectable, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';

// ===== Shape khớp đúng contract backend trong docs/API.md =====

export interface GeocodeResult {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

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

// ===== URL helpers thuần — tách riêng để unit test không cần HTTP =====

export function geocodeUrl(q: string, count = 5): string {
  return `/api/geocode?q=${encodeURIComponent(q)}&count=${count}`;
}

export function weatherUrl(lat: number, lon: number, days = 7): string {
  return `/api/weather?lat=${lat}&lon=${lon}&days=${days}`;
}

/** Map WMO weather code (Open-Meteo) sang nhãn hiển thị. */
export function weatherCodeLabel(code: number): string {
  if (code === 0) return '☀️ Trời quang';
  if (code <= 3) return '⛅ Có mây';
  if (code === 45 || code === 48) return '🌫️ Sương mù';
  if (code <= 57) return '🌦️ Mưa phùn';
  if (code <= 67) return '🌧️ Mưa';
  if (code <= 77) return '🌨️ Tuyết';
  if (code <= 82) return '🌧️ Mưa rào';
  if (code <= 86) return '🌨️ Tuyết rào';
  return '⛈️ Dông';
}

/**
 * State trung tâm của feature thời tiết: query đã submit + city đã chọn (signals),
 * hai httpResource reactive theo signal — đổi signal là tự re-fetch, không RxJS.
 */
@Injectable({ providedIn: 'root' })
export class WeatherApi {
  readonly submittedQuery = signal<string | undefined>(undefined);
  readonly selectedCity = signal<GeocodeResult | undefined>(undefined);

  readonly cities = httpResource<GeocodeResult[]>(() => {
    const q = this.submittedQuery();
    return q ? geocodeUrl(q) : undefined; // undefined = idle, chưa fetch
  });

  readonly forecast = httpResource<WeatherResponse>(() => {
    const city = this.selectedCity();
    return city ? weatherUrl(city.latitude, city.longitude) : undefined;
  });

  search(query: string): void {
    this.selectedCity.set(undefined); // tìm mới thì bỏ chọn city cũ
    this.submittedQuery.set(query.trim());
  }

  selectCity(city: GeocodeResult): void {
    this.selectedCity.set(city);
  }
}
