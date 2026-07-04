import { TestBed } from '@angular/core/testing';
import { I18n } from './i18n';
import { weatherCodeText, weekdayLabel, uvLabel } from './weather-api';
import { aqiLevelName } from './aqi';
import { buildAlerts } from './weather-alerts';
import type { WeatherResponse } from './weather-api';

function createI18n(): I18n {
  return TestBed.inject(I18n);
}

describe('I18n', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  it('mặc định tiếng Việt khi localStorage trống', () => {
    expect(createI18n().lang()).toBe('vi');
  });

  it('đọc lại lựa chọn đã lưu trong localStorage', () => {
    localStorage.setItem('weather-app.lang', 'en');
    expect(createI18n().lang()).toBe('en');
  });

  it('giá trị localStorage rác → fallback vi', () => {
    localStorage.setItem('weather-app.lang', 'fr');
    expect(createI18n().lang()).toBe('vi');
  });

  it('toggle chuyển vi ↔ en và lưu vào localStorage', () => {
    const i18n = createI18n();
    i18n.toggle();
    expect(i18n.lang()).toBe('en');
    expect(localStorage.getItem('weather-app.lang')).toBe('en');
    i18n.toggle();
    expect(i18n.lang()).toBe('vi');
  });

  it('t() trả bản dịch theo lang hiện tại', () => {
    const i18n = createI18n();
    expect(i18n.t('search.button')).toBe('Tìm');
    i18n.setLang('en');
    expect(i18n.t('search.button')).toBe('Search');
  });

  it('t() key không tồn tại → trả nguyên key', () => {
    expect(createI18n().t('does.not.exist')).toBe('does.not.exist');
  });

  it('t() thay placeholder {x} bằng param — MỌI lần xuất hiện (#74)', () => {
    const i18n = createI18n();
    expect(i18n.t('aqi.whoTimes', { x: 3 })).toBe('gấp 3× ngưỡng WHO');
    i18n.setLang('en');
    expect(i18n.t('aqi.whoTimes', { x: 3 })).toBe('3× WHO guideline');
    // Key không tồn tại trả nguyên key — nhưng param vẫn thay hết mọi chỗ
    expect(i18n.t('{n} of {n}', { n: 2 })).toBe('2 of 2');
  });
});

describe('helpers bản tiếng Anh', () => {
  it('weatherCodeText dịch theo lang', () => {
    expect(weatherCodeText(0, 'vi')).toContain('quang');
    expect(weatherCodeText(0, 'en')).toBe('Clear');
    expect(weatherCodeText(95, 'en')).toContain('Thunderstorm');
  });

  it('weekdayLabel: CN/T2 vs Sun/Mon', () => {
    // 2026-07-05 là Chủ nhật
    expect(weekdayLabel('2026-07-05', 'vi')).toBe('CN');
    expect(weekdayLabel('2026-07-05', 'en')).toBe('Sun');
    expect(weekdayLabel('2026-07-06', 'en')).toBe('Mon');
  });

  it('uvLabel dịch theo lang', () => {
    expect(uvLabel(1, 'en')).toBe('Low');
    expect(uvLabel(11, 'en')).toBe('Extreme');
    expect(uvLabel(1, 'vi')).toBe('Thấp');
  });

  it('aqiLevelName dịch theo lang', () => {
    expect(aqiLevelName(1, 'vi')).toBe('Tốt');
    expect(aqiLevelName(1, 'en')).toBe('Good');
    expect(aqiLevelName(6, 'en')).toBe('Hazardous');
  });

  it('buildAlerts sinh cảnh báo tiếng Anh khi lang=en', () => {
    const forecast = {
      current: { temperature: 39, apparentTemperature: 42, humidity: 50, windSpeed: 10, weatherCode: 0, isDay: 1 },
      hourly: [],
      daily: [{
        date: '2026-07-04', weatherCode: 0, tempMax: 39, tempMin: 28,
        precipitationSum: 0, precipitationProbabilityMax: 0, uvIndexMax: 5,
        sunrise: '2026-07-04T05:20', sunset: '2026-07-04T18:45',
      }],
    } as unknown as WeatherResponse;
    const viAlerts = buildAlerts(forecast, undefined, 'vi');
    const enAlerts = buildAlerts(forecast, undefined, 'en');
    expect(viAlerts.length).toBe(1);
    expect(enAlerts.length).toBe(1);
    expect(viAlerts[0].title).toContain('Nắng nóng');
    expect(enAlerts[0].title).toContain('heat');
  });
});
