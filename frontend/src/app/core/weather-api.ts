import { Injectable, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RecentLocations } from './recent-locations';

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

export interface AirQualityCurrent {
  usAqi: number;
  pm25: number;
  pm10: number;
  ozone: number;
  nitrogenDioxide: number;
  sulphurDioxide: number;
  carbonMonoxide: number;
}

export interface AirQualityHour {
  time: string;
  usAqi: number;
}

export interface AirQualityResponse {
  current: AirQualityCurrent;
  hourly: AirQualityHour[];
}

// ===== URL helpers thuần — tách riêng để unit test không cần HTTP =====

export function geocodeUrl(q: string, count = 5): string {
  return `/api/geocode?q=${encodeURIComponent(q)}&count=${count}`;
}

export function weatherUrl(lat: number, lon: number, days = 7): string {
  return `/api/weather?lat=${lat}&lon=${lon}&days=${days}`;
}

export function airQualityUrl(lat: number, lon: number): string {
  return `/api/air-quality?lat=${lat}&lon=${lon}`;
}

/** Tên city ảo cho vị trí hiện tại (Open-Meteo không có reverse geocoding). */
export const MY_LOCATION_NAME = 'Vị trí của tôi';

/** "Hanoi, Vietnam" — nhưng city ảo không có country thì chỉ "Vị trí của tôi", không dấu phẩy thừa. */
export function formatCityLabel(city: GeocodeResult): string {
  return city.country ? `${city.name}, ${city.country}` : city.name;
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
  private readonly recent = inject(RecentLocations);

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

  readonly airQuality = httpResource<AirQualityResponse>(() => {
    const city = this.selectedCity();
    return city ? airQualityUrl(city.latitude, city.longitude) : undefined;
  });

  // Trạng thái định vị — dùng cho nút "Thời tiết chỗ tôi"
  readonly locating = signal(false);
  readonly locationError = signal<string | undefined>(undefined);

  search(query: string): void {
    this.selectedCity.set(undefined); // tìm mới thì bỏ chọn city cũ
    this.submittedQuery.set(query.trim());
  }

  selectCity(city: GeocodeResult): void {
    this.selectedCity.set(city);
    this.recent.add(city);
  }

  /** Lấy vị trí hiện tại từ browser → chọn city ảo "Vị trí của tôi" (forecast + AQI tự chạy theo). */
  useMyLocation(): void {
    this.locationError.set(undefined);

    if (!('geolocation' in navigator)) {
      this.locationError.set('Trình duyệt này không hỗ trợ định vị.');
      return;
    }

    this.locating.set(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        // Làm tròn 4 số lẻ (~11m): đủ chính xác cho thời tiết, ổn định cho cache + lịch sử
        const round4 = (n: number) => Math.round(n * 10000) / 10000;
        this.locating.set(false);
        this.selectCity({
          name: MY_LOCATION_NAME,
          country: '',
          latitude: round4(position.coords.latitude),
          longitude: round4(position.coords.longitude),
        });
      },
      (error) => {
        this.locating.set(false);
        const messages: Record<number, string> = {
          1: 'Bạn đã từ chối quyền định vị — cấp lại trong cài đặt trình duyệt rồi thử lại.',
          2: 'Không xác định được vị trí — thử lại hoặc tìm theo tên thành phố.',
          3: 'Định vị quá lâu không phản hồi — thử lại nhé.',
        };
        this.locationError.set(messages[error.code] ?? 'Không định vị được — thử tìm theo tên thành phố.');
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }
}
