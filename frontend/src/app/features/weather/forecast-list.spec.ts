import { TestBed } from '@angular/core/testing';
import { ForecastList } from './forecast-list';
import { DailyForecast } from '../../core/weather-api';

describe('ForecastList', () => {
  // 2026-07-03 là thứ Sáu
  const days: DailyForecast[] = [
    { date: '2026-07-03', tempMax: 33.1, tempMin: 25.6, weatherCode: 96 },
    { date: '2026-07-04', tempMax: 32.0, tempMin: 25.1, weatherCode: 61 },
  ];

  // Unit 'F' còn sót trong localStorage từ spec khác sẽ làm nhiệt độ render thành °F (flaky theo thứ tự chạy)
  beforeEach(() => localStorage.clear());

  it('render mỗi ngày một card với thứ, ngày, max/min', async () => {
    await TestBed.configureTestingModule({ imports: [ForecastList] }).compileComponents();
    const fixture = TestBed.createComponent(ForecastList);
    fixture.componentRef.setInput('days', days);
    await fixture.whenStable();

    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('li');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('T6');
    expect(items[0].textContent).toContain('3/7');
    expect(items[0].textContent).toContain('33.1°');
    expect(items[0].textContent).toContain('25.6°');
    expect(items[0].getAttribute('title')).toBe('Dông');
    expect(items[1].textContent).toContain('T7');
    expect(items[1].getAttribute('title')).toBe('Mưa');
  });
});
