import { TestBed } from '@angular/core/testing';
import { UnitPreference, convertTemp } from './unit-preference';

describe('convertTemp', () => {
  it('giữ nguyên khi đơn vị C', () => {
    expect(convertTemp(30, 'C')).toBe(30);
  });

  it('đổi sang F làm tròn 1 số lẻ', () => {
    expect(convertTemp(0, 'F')).toBe(32);
    expect(convertTemp(30, 'F')).toBe(86);
    expect(convertTemp(25.6, 'F')).toBe(78.1);
    expect(convertTemp(-40, 'F')).toBe(-40);
  });
});

describe('UnitPreference', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('mặc định C khi localStorage trống', () => {
    const pref = TestBed.inject(UnitPreference);
    expect(pref.unit()).toBe('C');
  });

  it('toggle đổi C↔F và lưu vào localStorage', () => {
    const pref = TestBed.inject(UnitPreference);

    pref.toggle();
    expect(pref.unit()).toBe('F');
    expect(localStorage.getItem('weather-app.unit')).toBe('F');

    pref.toggle();
    expect(pref.unit()).toBe('C');
    expect(localStorage.getItem('weather-app.unit')).toBe('C');
  });

  it('đọc F đã lưu từ localStorage khi khởi tạo', () => {
    localStorage.setItem('weather-app.unit', 'F');
    const pref = TestBed.inject(UnitPreference);
    expect(pref.unit()).toBe('F');
  });

  it('giá trị lạ trong localStorage thì fallback về C', () => {
    localStorage.setItem('weather-app.unit', 'kelvin');
    const pref = TestBed.inject(UnitPreference);
    expect(pref.unit()).toBe('C');
  });
});
