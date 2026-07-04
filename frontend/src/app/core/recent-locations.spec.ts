import { TestBed } from '@angular/core/testing';
import { RecentLocations } from './recent-locations';
import { GeocodeResult } from './weather-api';

describe('RecentLocations', () => {
  const hanoi: GeocodeResult = { name: 'Hanoi', country: 'Vietnam', latitude: 21.0245, longitude: 105.8412 };
  const hue: GeocodeResult = { name: 'Huế', country: 'Vietnam', latitude: 16.4619, longitude: 107.59546 };

  function city(i: number): GeocodeResult {
    return { name: `City${i}`, country: 'X', latitude: i, longitude: i };
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('add đưa city mới nhất lên đầu và lưu localStorage', () => {
    const recent = TestBed.inject(RecentLocations);

    recent.add(hanoi);
    recent.add(hue);

    expect(recent.locations().map((c) => c.name)).toEqual(['Huế', 'Hanoi']);
    expect(JSON.parse(localStorage.getItem('weather-app.recent')!)).toHaveLength(2);
  });

  it('chọn lại city đã có thì đưa lên đầu, không nhân đôi', () => {
    const recent = TestBed.inject(RecentLocations);

    recent.add(hanoi);
    recent.add(hue);
    recent.add(hanoi);

    expect(recent.locations().map((c) => c.name)).toEqual(['Hanoi', 'Huế']);
  });

  it('cùng nhãn (name+country) nhưng tọa độ xê dịch thì thay thế, không nhân bản — case Vị trí của tôi', () => {
    const recent = TestBed.inject(RecentLocations);

    recent.add({ name: 'Vị trí của tôi', country: '', latitude: 21.0278, longitude: 105.8342 });
    recent.add({ name: 'Vị trí của tôi', country: '', latitude: 21.0301, longitude: 105.8399 });

    expect(recent.locations()).toHaveLength(1);
    expect(recent.locations()[0].latitude).toBe(21.0301); // giữ bản mới nhất
  });

  it('giữ tối đa 5 địa điểm', () => {
    const recent = TestBed.inject(RecentLocations);

    for (let i = 1; i <= 7; i++) {
      recent.add(city(i));
    }

    expect(recent.locations()).toHaveLength(5);
    expect(recent.locations()[0].name).toBe('City7');
  });

  it('đọc lại danh sách từ localStorage khi khởi tạo', () => {
    localStorage.setItem('weather-app.recent', JSON.stringify([hanoi]));

    const recent = TestBed.inject(RecentLocations);

    expect(recent.locations().map((c) => c.name)).toEqual(['Hanoi']);
  });

  it('dữ liệu hỏng trong localStorage thì fallback mảng rỗng', () => {
    localStorage.setItem('weather-app.recent', '{not json[');

    const recent = TestBed.inject(RecentLocations);

    expect(recent.locations()).toEqual([]);
  });

  it('phần tử sai shape trong storage bị lọc bỏ', () => {
    localStorage.setItem('weather-app.recent', JSON.stringify([hanoi, { name: 'thiếu tọa độ' }, 42]));

    const recent = TestBed.inject(RecentLocations);

    expect(recent.locations().map((c) => c.name)).toEqual(['Hanoi']);
  });

  it('clear xóa cả signal lẫn localStorage', () => {
    const recent = TestBed.inject(RecentLocations);
    recent.add(hanoi);

    recent.clear();

    expect(recent.locations()).toEqual([]);
    expect(JSON.parse(localStorage.getItem('weather-app.recent')!)).toEqual([]);
  });
});
