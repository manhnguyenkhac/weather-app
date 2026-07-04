import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AirQualityPanel } from './air-quality-panel';
import { WeatherApi } from '../../core/weather-api';

describe('AirQualityPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [AirQualityPanel],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('hiện trạng thái đang tải khi resource pending (đã chọn city)', () => {
    const api = TestBed.inject(WeatherApi);
    api.selectCity({ name: 'Hanoi', country: 'Vietnam', latitude: 21.0245, longitude: 105.8412 });

    const fixture = TestBed.createComponent(AirQualityPanel);
    // Resource pending nên không whenStable() (treo) — dùng CD đồng bộ
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Chất lượng không khí');
    expect(el.textContent).toContain('Đang tải chỉ số không khí');
  });

  it('chưa chọn city thì resource idle — không loading, không gauge', () => {
    const fixture = TestBed.createComponent(AirQualityPanel);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).not.toContain('Đang tải');
    expect(el.querySelector('svg')).toBeNull();
  });
});
