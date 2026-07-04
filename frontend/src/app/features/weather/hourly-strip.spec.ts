import { TestBed } from '@angular/core/testing';
import { HourlyStrip } from './hourly-strip';
import { HourlyForecast } from '../../core/weather-api';
import { UnitPreference } from '../../core/unit-preference';

describe('HourlyStrip', () => {
  const hours: HourlyForecast[] = [
    { time: '2026-07-03T14:00', temperature: 30, weatherCode: 3 },
    { time: '2026-07-03T15:00', temperature: 29.5, weatherCode: 61 },
  ];

  beforeEach(() => localStorage.clear());

  async function createFixture() {
    await TestBed.configureTestingModule({ imports: [HourlyStrip] }).compileComponents();
    const fixture = TestBed.createComponent(HourlyStrip);
    fixture.componentRef.setInput('hours', hours);
    await fixture.whenStable();
    return fixture;
  }

  it('render mỗi giờ một ô với nhãn giờ và nhiệt độ', async () => {
    const fixture = await createFixture();

    const items = (fixture.nativeElement as HTMLElement).querySelectorAll('li');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('14h');
    expect(items[0].textContent).toContain('30°');
    expect(items[1].textContent).toContain('15h');
    expect(items[1].textContent).toContain('29.5°');
  });

  it('limit cắt số giờ hiển thị (hourly giờ phủ cả tuần)', async () => {
    const manyHours = Array.from({ length: 48 }, (_, i) => ({
      time: `2026-07-0${3 + Math.floor(i / 24)}T${String(i % 24).padStart(2, '0')}:00`,
      temperature: 25 + (i % 5),
      weatherCode: 3,
    }));
    await TestBed.configureTestingModule({ imports: [HourlyStrip] }).compileComponents();
    const fixture = TestBed.createComponent(HourlyStrip);
    fixture.componentRef.setInput('hours', manyHours);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelectorAll('li').length).toBe(24);
  });

  it('toggle đơn vị thì nhiệt độ hourly đổi sang °F', async () => {
    const fixture = await createFixture();

    TestBed.inject(UnitPreference).toggle();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('86°'); // 30°C = 86°F
  });
});
