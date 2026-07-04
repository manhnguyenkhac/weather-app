import { TestBed } from '@angular/core/testing';
import { TemperatureChart } from './temperature-chart';
import { DailyForecast, HourlyForecast } from '../../core/weather-api';
import { UnitPreference } from '../../core/unit-preference';

describe('TemperatureChart', () => {
  const hours: HourlyForecast[] = Array.from({ length: 24 }, (_, i) => ({
    time: `2026-07-04T${String(i).padStart(2, '0')}:00`,
    temperature: 25 + Math.sin(i / 4) * 5,
    weatherCode: 3,
  }));

  const days: DailyForecast[] = [
    {
      date: '2026-07-04', tempMax: 31, tempMin: 25, weatherCode: 3,
      sunrise: '2026-07-04T05:19', sunset: '2026-07-04T18:43',
      uvIndexMax: 7, precipitationSum: 0, precipitationProbabilityMax: 10,
    },
    {
      date: '2026-07-05', tempMax: 33, tempMin: 26, weatherCode: 61,
      sunrise: '2026-07-05T05:20', sunset: '2026-07-05T18:43',
      uvIndexMax: 8, precipitationSum: 5, precipitationProbabilityMax: 60,
    },
  ];

  beforeEach(() => localStorage.clear());

  async function createFixture() {
    await TestBed.configureTestingModule({ imports: [TemperatureChart] }).compileComponents();
    const fixture = TestBed.createComponent(TemperatureChart);
    fixture.componentRef.setInput('hours', hours);
    fixture.componentRef.setInput('days', days);
    await fixture.whenStable();
    return fixture;
  }

  it('render line chart 24h (đường + vùng tô + nhãn cực trị) và range chart theo ngày', async () => {
    const fixture = await createFixture();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.line-chart path.line')).toBeTruthy();
    expect(el.querySelector('.line-chart path.area')).toBeTruthy();
    expect(el.querySelectorAll('.line-chart .extreme').length).toBe(2); // nóng nhất + lạnh nhất
    expect(el.querySelectorAll('.range-chart .range-bar').length).toBe(2);
    expect(el.textContent).toContain('T7'); // thứ của 04/07
    expect(el.textContent).toContain('33°'); // max ngày 05/07
  });

  it('hover đặt hoverIndex thì hiện crosshair + tooltip đúng giờ', async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;

    component.hoverIndex.set(6);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.crosshair')).toBeTruthy();
    expect(el.querySelector('.tooltip')!.textContent).toContain('6h');
  });

  it('toggle đơn vị thì nhãn trục và cực trị đổi theo °F', async () => {
    const fixture = await createFixture();

    TestBed.inject(UnitPreference).toggle();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;

    // 33°C = 91.4°F trên range chart
    expect(el.textContent).toContain('91.4°');
  });
});
