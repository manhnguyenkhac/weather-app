import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import {
  WeatherApi,
  GeocodeResult,
  geocodeUrl,
  weatherUrl,
  weatherCodeLabel,
  weatherCodeEmoji,
  weatherCodeText,
  hourLabel,
  weekdayLabel,
} from './weather-api';

describe('URL helpers', () => {
  it('geocodeUrl encode query và count mặc định 5', () => {
    expect(geocodeUrl('Hà Nội')).toBe('/api/geocode?q=H%C3%A0%20N%E1%BB%99i&count=5');
  });

  it('weatherUrl ghép lat/lon/days', () => {
    expect(weatherUrl(21.0278, 105.8342)).toBe('/api/weather?lat=21.0278&lon=105.8342&days=7');
    expect(weatherUrl(16.06778, 108.22083, 3)).toBe('/api/weather?lat=16.06778&lon=108.22083&days=3');
  });
});

describe('weatherCodeLabel', () => {
  it('map các nhóm WMO code chính', () => {
    expect(weatherCodeLabel(0)).toContain('Trời quang');
    expect(weatherCodeLabel(3)).toContain('Có mây');
    expect(weatherCodeLabel(45)).toContain('Sương mù');
    expect(weatherCodeLabel(55)).toContain('Mưa phùn');
    expect(weatherCodeLabel(63)).toContain('Mưa');
    expect(weatherCodeLabel(75)).toContain('Tuyết');
    expect(weatherCodeLabel(81)).toContain('Mưa rào');
    expect(weatherCodeLabel(96)).toContain('Dông');
  });
});

describe('label helpers', () => {
  it('tách emoji và chữ từ weatherCodeLabel', () => {
    expect(weatherCodeEmoji(96)).toBe('⛈️');
    expect(weatherCodeText(96)).toBe('Dông');
    expect(weatherCodeText(3)).toBe('Có mây');
  });

  it('hourLabel rút gọn ISO time thành giờ', () => {
    expect(hourLabel('2026-07-03T14:00')).toBe('14h');
    expect(hourLabel('2026-07-03T05:00')).toBe('5h');
  });

  it('weekdayLabel đổi ISO date thành thứ trong tuần', () => {
    expect(weekdayLabel('2026-07-03')).toBe('T6'); // thứ Sáu
    expect(weekdayLabel('2026-07-05')).toBe('CN'); // Chủ nhật
  });
});

describe('WeatherApi', () => {
  const hanoi: GeocodeResult = { name: 'Hanoi', country: 'Vietnam', latitude: 21.0245, longitude: 105.8412 };

  function createService(): WeatherApi {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    return TestBed.inject(WeatherApi);
  }

  it('search() lưu query đã trim và bỏ chọn city cũ', () => {
    const api = createService();
    api.selectCity(hanoi);

    api.search('  Da Nang  ');

    expect(api.submittedQuery()).toBe('Da Nang');
    expect(api.selectedCity()).toBeUndefined();
  });

  it('selectCity() lưu city được chọn', () => {
    const api = createService();

    api.selectCity(hanoi);

    expect(api.selectedCity()).toEqual(hanoi);
  });

  it('resource ở trạng thái idle khi chưa search/chọn gì', () => {
    const api = createService();

    expect(api.cities.hasValue()).toBe(false);
    expect(api.forecast.hasValue()).toBe(false);
  });
});
