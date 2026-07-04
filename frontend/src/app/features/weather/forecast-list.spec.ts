import { TestBed } from '@angular/core/testing';
import { ForecastList } from './forecast-list';
import { DailyForecast, HourlyForecast } from '../../core/weather-api';

describe('ForecastList', () => {
  // 2026-07-03 là thứ Sáu
  const days: DailyForecast[] = [
    {
      date: '2026-07-03', tempMax: 33.1, tempMin: 25.6, weatherCode: 96,
      sunrise: '2026-07-03T05:19', sunset: '2026-07-03T18:43',
      uvIndexMax: 8.5, precipitationSum: 12.3, precipitationProbabilityMax: 88,
    },
    {
      date: '2026-07-04', tempMax: 32.0, tempMin: 25.1, weatherCode: 61,
      sunrise: '2026-07-04T05:20', sunset: '2026-07-04T18:43',
      uvIndexMax: 7.0, precipitationSum: 4.0, precipitationProbabilityMax: 60,
    },
  ];

  const hours: HourlyForecast[] = [
    { time: '2026-07-03T14:00', temperature: 30, weatherCode: 3 },
    { time: '2026-07-03T15:00', temperature: 29.5, weatherCode: 61 },
    { time: '2026-07-04T08:00', temperature: 27, weatherCode: 61 },
  ];

  beforeEach(() => localStorage.clear());

  async function createFixture() {
    await TestBed.configureTestingModule({ imports: [ForecastList] }).compileComponents();
    const fixture = TestBed.createComponent(ForecastList);
    fixture.componentRef.setInput('days', days);
    fixture.componentRef.setInput('hours', hours);
    await fixture.whenStable();
    return fixture;
  }

  it('render mỗi ngày một card với thứ, ngày, max/min', async () => {
    const fixture = await createFixture();

    const cards = (fixture.nativeElement as HTMLElement).querySelectorAll('.day-card');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('T6');
    expect(cards[0].textContent).toContain('3/7');
    expect(cards[0].textContent).toContain('33.1°');
    expect(cards[0].textContent).toContain('25.6°');
    expect(cards[0].getAttribute('title')).toBe('Dông');
    expect(cards[1].textContent).toContain('T7');
    expect(cards[1].getAttribute('title')).toBe('Mưa');
  });

  it('bấm ngày thì xổ chi tiết: mọc/lặn, UV, mưa và hourly RIÊNG ngày đó', async () => {
    const fixture = await createFixture();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.day-detail')).toBeNull(); // mặc định gập

    (el.querySelectorAll('.day-card')[0] as HTMLButtonElement).click();
    await fixture.whenStable();

    const detail = el.querySelector('.day-detail')!;
    expect(detail.textContent).toContain('Mọc 05:19');
    expect(detail.textContent).toContain('Lặn 18:43');
    expect(detail.textContent).toContain('UV 8.5 — Rất cao');
    expect(detail.textContent).toContain('Mưa 12.3 mm (88%)');
    // chỉ 2 giờ của ngày 03/07, không lẫn giờ của 04/07
    expect(detail.querySelectorAll('.strip li').length).toBe(2);
    expect(detail.textContent).toContain('14h');
    expect(detail.textContent).not.toContain('8h');
  });

  it('bấm lại chính ngày đó thì gập; bấm ngày khác thì chuyển chi tiết', async () => {
    const fixture = await createFixture();
    const el = fixture.nativeElement as HTMLElement;
    const cards = el.querySelectorAll('.day-card');

    (cards[0] as HTMLButtonElement).click();
    await fixture.whenStable();
    (cards[0] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(el.querySelector('.day-detail')).toBeNull();

    (cards[0] as HTMLButtonElement).click();
    await fixture.whenStable();
    (cards[1] as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(el.querySelector('.day-detail')!.textContent).toContain('UV 7 — Cao');
  });
});
