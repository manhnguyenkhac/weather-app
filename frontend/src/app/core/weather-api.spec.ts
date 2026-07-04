import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RecentLocations } from './recent-locations';
import {
  WeatherApi,
  GeocodeResult,
  MY_LOCATION_NAME,
  formatCityLabel,
  geocodeUrl,
  weatherUrl,
  weatherCodeLabel,
  weatherCodeEmoji,
  weatherCodeText,
  hourLabel,
  timeOfDay,
  uvLabel,
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
    localStorage.clear();
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

  it('selectCity() lưu city được chọn và ghi vào lịch sử gần đây', () => {
    const api = createService();

    api.selectCity(hanoi);

    expect(api.selectedCity()).toEqual(hanoi);
    expect(TestBed.inject(RecentLocations).locations()[0]).toEqual(hanoi);
  });

  it('resource ở trạng thái idle khi chưa search/chọn gì', () => {
    const api = createService();

    expect(api.cities.hasValue()).toBe(false);
    expect(api.forecast.hasValue()).toBe(false);
  });

  function mockGeolocation(impl: Partial<Geolocation>) {
    Object.defineProperty(navigator, 'geolocation', { value: impl, configurable: true });
  }

  it('callback định vị muộn KHÔNG ghi đè city user vừa chọn (#74)', () => {
    const api = createService();
    let lateSuccess: PositionCallback | undefined;
    mockGeolocation({
      getCurrentPosition: (success) => { lateSuccess = success; }, // GPS chưa trả — giữ callback
    });

    api.useMyLocation();
    const tokyo = { name: 'Tokyo', country: 'Japan', latitude: 35.68, longitude: 139.69 };
    api.selectCity(tokyo); // user hết kiên nhẫn, chọn tay
    lateSuccess!({ coords: { latitude: 21.0278, longitude: 105.8342 } } as GeolocationPosition);

    expect(api.selectedCity()).toEqual(tokyo); // không bị nhảy ngược về "Vị trí của tôi"
  });

  it('useMyLocation thành công: chọn city ảo với tọa độ làm tròn 4 số lẻ', () => {
    const api = createService();
    mockGeolocation({
      getCurrentPosition: (success) =>
        success({ coords: { latitude: 21.02781234, longitude: 105.83421987 } } as GeolocationPosition),
    });

    api.useMyLocation();

    expect(api.locating()).toBe(false);
    expect(api.locationError()).toBeUndefined();
    expect(api.selectedCity()).toEqual({
      name: MY_LOCATION_NAME,
      country: '',
      latitude: 21.0278,
      longitude: 105.8342,
    });
  });

  it('useMyLocation bị từ chối quyền: lưu key i18n geo.denied, không chọn city', () => {
    const api = createService();
    mockGeolocation({
      getCurrentPosition: (_success, errorCb) =>
        errorCb!({ code: 1, message: 'denied' } as GeolocationPositionError),
    });

    api.useMyLocation();

    expect(api.locating()).toBe(false);
    expect(api.locationError()).toBe('geo.denied');
    expect(api.selectedCity()).toBeUndefined();
  });
});

describe('timeOfDay / uvLabel', () => {
  it('timeOfDay rút hh:mm từ ISO, fallback — khi rỗng', () => {
    expect(timeOfDay('2026-07-04T05:19')).toBe('05:19');
    expect(timeOfDay('')).toBe('—');
  });

  it('uvLabel theo thang WHO', () => {
    expect(uvLabel(1)).toBe('Thấp');
    expect(uvLabel(3)).toBe('Trung bình');
    expect(uvLabel(6.5)).toBe('Cao');
    expect(uvLabel(8.5)).toBe('Rất cao');
    expect(uvLabel(11)).toBe('Cực đoan');
  });
});

describe('formatCityLabel', () => {
  it('có country thì "name, country"; city ảo không country thì chỉ name', () => {
    expect(formatCityLabel({ name: 'Hanoi', country: 'Vietnam', latitude: 1, longitude: 1 })).toBe('Hanoi, Vietnam');
    expect(formatCityLabel({ name: MY_LOCATION_NAME, country: '', latitude: 1, longitude: 1 })).toBe(MY_LOCATION_NAME);
  });
});
