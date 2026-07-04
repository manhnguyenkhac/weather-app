import { TestBed } from '@angular/core/testing';
import { WeatherCard } from './weather-card';
import { CurrentWeather, GeocodeResult } from '../../core/weather-api';
import { UnitPreference } from '../../core/unit-preference';

describe('WeatherCard', () => {
  const city: GeocodeResult = { name: 'Hanoi', country: 'Vietnam', latitude: 21.0245, longitude: 105.8412 };
  const current: CurrentWeather = {
    temperature: 30,
    apparentTemperature: 36.2,
    humidity: 78,
    windSpeed: 6.8,
    weatherCode: 3,
    time: '2026-07-04T14:15',
  };

  beforeEach(() => localStorage.clear());

  async function createFixture() {
    await TestBed.configureTestingModule({ imports: [WeatherCard] }).compileComponents();
    const fixture = TestBed.createComponent(WeatherCard);
    fixture.componentRef.setInput('city', city);
    fixture.componentRef.setInput('current', current);
    await fixture.whenStable();
    return fixture;
  }

  it('render hero: city, nhiệt độ °C, RealFeel, độ ẩm, gió, nhãn thời tiết', async () => {
    const fixture = await createFixture();

    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('Hanoi, Vietnam');
    expect(text).toContain('30°C');
    expect(text).toContain('RealFeel® 36.2°');
    expect(text).toContain('Độ ẩm 78%');
    expect(text).toContain('Gió 6.8 km/h');
    expect(text).toContain('Có mây');
  });

  it('toggle đơn vị thì nhiệt độ và RealFeel đổi sang °F tức thì', async () => {
    const fixture = await createFixture();

    TestBed.inject(UnitPreference).toggle();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('86°F'); // 30°C = 86°F
    expect(text).toContain('RealFeel® 97.2°'); // 36.2°C = 97.2°F
  });
});
