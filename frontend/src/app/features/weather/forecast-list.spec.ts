import { TestBed } from '@angular/core/testing';
import { ForecastList } from './forecast-list';
import { DailyForecast } from '../../core/weather-api';

describe('ForecastList', () => {
  const days: DailyForecast[] = [
    { date: '2026-07-03', tempMax: 33.1, tempMin: 25.6, weatherCode: 96 },
    { date: '2026-07-04', tempMax: 32.0, tempMin: 25.1, weatherCode: 61 },
  ];

  it('render mỗi ngày một dòng với nhiệt độ và nhãn thời tiết', async () => {
    await TestBed.configureTestingModule({ imports: [ForecastList] }).compileComponents();
    const fixture = TestBed.createComponent(ForecastList);
    fixture.componentRef.setInput('days', days);
    await fixture.whenStable();

    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('li');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('2026-07-03');
    expect(items[0].textContent).toContain('25.6° – 33.1°');
    expect(items[0].textContent).toContain('Dông');
    expect(items[1].textContent).toContain('Mưa');
  });
});
