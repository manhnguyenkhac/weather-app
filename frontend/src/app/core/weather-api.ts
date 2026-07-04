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
  /** ISO local của city (vd "2026-07-04T21:15") — mốc "bây giờ" trong mảng hourly. */
  time: string;
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
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
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

export interface HistoryDay {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitation: number;
}

export interface HistoryNormal {
  tempMax: number;
  tempMin: number;
}

export interface HistoryResponse {
  days: HistoryDay[];
  normal: HistoryNormal | null;
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

export function historyUrl(lat: number, lon: number): string {
  return `/api/history?lat=${lat}&lon=${lon}`;
}

/**
 * Vị trí của "bây giờ" trong mảng hourly. Backend trả hourly từ 00:00 giờ địa phương của CITY
 * (không phải từ giờ hiện tại) nên mọi cửa sổ "24h tới" phải slice từ index này.
 * Không xác định được (time rỗng/không khớp) thì fallback 0 — hành vi cũ.
 */
export function currentHourIndex(current: CurrentWeather, hourly: HourlyForecast[]): number {
  const hourKey = (current.time ?? '').slice(0, 13); // "2026-07-04T21"
  if (hourKey.length < 13) return 0;
  const index = hourly.findIndex((h) => h.time.slice(0, 13) === hourKey);
  return index >= 0 ? index : 0;
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

/** "2026-07-04T05:19" → "05:19" — giờ mọc/lặn. Rỗng/không có T → "—". */
export function timeOfDay(isoTime: string): string {
  const timePart = isoTime.split('T')[1];
  return timePart ? timePart.slice(0, 5) : '—';
}

/** Nhãn mức UV theo thang WHO. */
export function uvLabel(uv: number, lang: 'vi' | 'en' = 'vi'): string {
  const labels = lang === 'vi'
    ? ['Thấp', 'Trung bình', 'Cao', 'Rất cao', 'Cực đoan']
    : ['Low', 'Moderate', 'High', 'Very high', 'Extreme'];
  if (uv < 3) return labels[0];
  if (uv < 6) return labels[1];
  if (uv < 8) return labels[2];
  if (uv < 11) return labels[3];
  return labels[4];
}

/** "2026-07-03" → "T6" / "CN" (vi) hoặc "Fri" / "Sun" (en). */
export function weekdayLabel(isoDate: string, lang: 'vi' | 'en' = 'vi'): string {
  const day = new Date(`${isoDate}T00:00:00`).getDay();
  const names = lang === 'vi'
    ? ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return names[day] ?? isoDate;
}

/** Phần emoji của nhãn thời tiết — dùng làm icon lớn trên card (không phụ thuộc ngôn ngữ). */
export function weatherCodeEmoji(code: number): string {
  return weatherCodeLabel(code).split(' ')[0];
}

/** Phần chữ của nhãn thời tiết (bỏ emoji). */
export function weatherCodeText(code: number, lang: 'vi' | 'en' = 'vi'): string {
  return weatherCodeLabel(code, lang).split(' ').slice(1).join(' ');
}

/** Map WMO weather code (Open-Meteo) sang nhãn hiển thị. */
export function weatherCodeLabel(code: number, lang: 'vi' | 'en' = 'vi'): string {
  const texts = lang === 'vi'
    ? ['Trời quang', 'Có mây', 'Sương mù', 'Mưa phùn', 'Mưa', 'Tuyết', 'Mưa rào', 'Tuyết rào', 'Dông']
    : ['Clear', 'Cloudy', 'Fog', 'Drizzle', 'Rain', 'Snow', 'Showers', 'Snow showers', 'Thunderstorm'];
  if (code === 0) return `☀️ ${texts[0]}`;
  if (code <= 3) return `⛅ ${texts[1]}`;
  if (code === 45 || code === 48) return `🌫️ ${texts[2]}`;
  if (code <= 57) return `🌦️ ${texts[3]}`;
  if (code <= 67) return `🌧️ ${texts[4]}`;
  if (code <= 77) return `🌨️ ${texts[5]}`;
  if (code <= 82) return `🌧️ ${texts[6]}`;
  if (code <= 86) return `🌨️ ${texts[7]}`;
  return `⛈️ ${texts[8]}`;
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

  // Token vô hiệu hóa callback định vị muộn: user đã chọn city khác thì kết quả
  // getCurrentPosition về sau không được ghi đè lựa chọn mới (#74)
  private locateToken = 0;

  search(query: string): void {
    this.locateToken++;
    this.selectedCity.set(undefined); // tìm mới thì bỏ chọn city cũ
    this.submittedQuery.set(query.trim());
  }

  /** addToRecent=false cho city ảo từ click bản đồ — không làm rác lịch sử (#74). */
  selectCity(city: GeocodeResult, addToRecent = true): void {
    this.locateToken++;
    this.selectedCity.set(city);
    if (addToRecent) {
      this.recent.add(city);
    }
  }

  /** Lấy vị trí hiện tại từ browser → chọn city ảo "Vị trí của tôi" (forecast + AQI tự chạy theo). */
  useMyLocation(): void {
    this.locationError.set(undefined);

    if (!('geolocation' in navigator)) {
      this.locationError.set('geo.unsupported');
      return;
    }

    this.locating.set(true);
    const token = ++this.locateToken;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.locating.set(false);
        // Callback muộn: user đã chọn city khác trong lúc chờ quyền/GPS — không ghi đè
        if (token !== this.locateToken) {
          return;
        }
        // Làm tròn 4 số lẻ (~11m): đủ chính xác cho thời tiết, ổn định cho cache + lịch sử
        const round4 = (n: number) => Math.round(n * 10000) / 10000;
        this.selectCity({
          name: MY_LOCATION_NAME,
          country: '',
          latitude: round4(position.coords.latitude),
          longitude: round4(position.coords.longitude),
        });
      },
      (error) => {
        this.locating.set(false);
        // Lưu KEY i18n — component dịch lúc render nên đổi ngôn ngữ là message đổi theo
        const keys: Record<number, string> = { 1: 'geo.denied', 2: 'geo.unavailable', 3: 'geo.timeout' };
        this.locationError.set(keys[error.code] ?? 'geo.generic');
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }
}
