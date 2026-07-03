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
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
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
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

// ===== URL helpers thuần — tách riêng để unit test không cần HTTP =====

export function geocodeUrl(q: string, count = 5): string {
  return `/api/geocode?q=${encodeURIComponent(q)}&count=${count}`;
}

export function weatherUrl(lat: number, lon: number, days = 7): string {
  return `/api/weather?lat=${lat}&lon=${lon}&days=${days}`;
}

/** "2026-07-03T14:00" → "14h" — nhãn giờ cho dải hourly. */
export function hourLabel(isoTime: string): string {
  const timePart = isoTime.split('T')[1] ?? '';
  const hour = timePart.slice(0, 2);
  return hour ? `${Number(hour)}h` : isoTime;
}

/** "2026-07-03" → "T6" / "CN" — nhãn thứ trong tuần cho card daily. */
export function weekdayLabel(isoDate: string): string {
  const day = new Date(`${isoDate}T00:00:00`).getDay();
  return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][day] ?? isoDate;
}

/** Phần emoji của nhãn thời tiết — dùng làm icon lớn trên card. */
export function weatherCodeEmoji(code: number): string {
  return weatherCodeLabel(code).split(' ')[0];
}

/** Phần chữ của nhãn thời tiết (bỏ emoji). */
export function weatherCodeText(code: number): string {
  return weatherCodeLabel(code).split(' ').slice(1).join(' ');
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
