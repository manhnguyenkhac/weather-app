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

  function createFixture() {
    const fixture = TestBed.createComponent(AirQualityPanel);
    // Resource có thể pending nên không whenStable() (treo) — dùng CD đồng bộ
    fixture.detectChanges();
    return fixture;
  }

  it('mặc định thu gọn: chỉ có header + tóm tắt, không render gauge', () => {
    const api = TestBed.inject(WeatherApi);
    api.selectCity({ name: 'Hanoi', country: 'Vietnam', latitude: 21.0245, longitude: 105.8412 });

    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Chất lượng không khí');
    expect(el.querySelector('svg')).toBeNull();
    expect(el.querySelector('.head')!.getAttribute('aria-expanded')).toBe('false');
    // resource pending → tóm tắt hiện Đang tải
    expect(el.querySelector('.summary')!.textContent).toContain('Đang tải');
  });

  it('bấm header thì dropdown mở (aria-expanded=true) và hiện phần thân', () => {
    const api = TestBed.inject(WeatherApi);
    api.selectCity({ name: 'Hanoi', country: 'Vietnam', latitude: 21.0245, longitude: 105.8412 });

    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.head') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(el.querySelector('.head')!.getAttribute('aria-expanded')).toBe('true');
    expect(el.textContent).toContain('Đang tải chỉ số không khí');

    // bấm lần nữa thì gập lại
    (el.querySelector('.head') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.head')!.getAttribute('aria-expanded')).toBe('false');
  });

  it('chưa chọn city thì resource idle — tóm tắt trống, không loading', () => {
    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).not.toContain('Đang tải');
    expect(el.querySelector('svg')).toBeNull();
  });
});
