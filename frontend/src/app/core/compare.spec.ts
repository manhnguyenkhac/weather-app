import { TestBed } from '@angular/core/testing';
import { CompareList } from './compare';
import { GeocodeResult } from './weather-api';

describe('CompareList', () => {
  const hanoi: GeocodeResult = { name: 'Hanoi', country: 'Vietnam', latitude: 21.0245, longitude: 105.8412 };
  const hue: GeocodeResult = { name: 'Huế', country: 'Vietnam', latitude: 16.4619, longitude: 107.59546 };
  const danang: GeocodeResult = { name: 'Da Nang', country: 'Vietnam', latitude: 16.06778, longitude: 108.22083 };
  const saigon: GeocodeResult = { name: 'Ho Chi Minh City', country: 'Vietnam', latitude: 10.82302, longitude: 106.62965 };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('add tối đa 3 — cái thứ 4 bị từ chối', () => {
    const list = TestBed.inject(CompareList);

    expect(list.add(hanoi)).toBe(true);
    expect(list.add(hue)).toBe(true);
    expect(list.add(danang)).toBe(true);
    expect(list.add(saigon)).toBe(false);
    expect(list.cities()).toHaveLength(3);
  });

  it('trùng nhãn không thêm lại', () => {
    const list = TestBed.inject(CompareList);
    list.add(hanoi);

    expect(list.add({ ...hanoi, latitude: 21.03 })).toBe(false);
    expect(list.cities()).toHaveLength(1);
  });

  it('remove và persist qua localStorage', () => {
    const list = TestBed.inject(CompareList);
    list.add(hanoi);
    list.add(hue);

    list.remove(hanoi);

    expect(list.cities().map((c) => c.name)).toEqual(['Huế']);
    expect(JSON.parse(localStorage.getItem('weather-app.compare')!)).toHaveLength(1);
  });

  it('đọc lại từ localStorage, lọc dữ liệu hỏng', () => {
    localStorage.setItem('weather-app.compare', JSON.stringify([hanoi, { hong: true }, 5]));

    const list = TestBed.inject(CompareList);

    expect(list.cities().map((c) => c.name)).toEqual(['Hanoi']);
  });
});
