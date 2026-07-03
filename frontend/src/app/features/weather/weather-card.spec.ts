import { TestBed } from '@angular/core/testing';
import { WeatherCard } from './weather-card';
import { CurrentWeather, GeocodeResult } from '../../core/weather-api';

describe('WeatherCard', () => {
  const city: GeocodeResult = { name: 'Hanoi', country: 'Vietnam', latitude: 21.0245, longitude: 105.8412 };
  const current: CurrentWeather = { temperature: 30, windSpeed: 6.8, weatherCode: 3 };

  it('render tên city, nhiệt độ hiện tại, gió và nhãn thời tiết', async () => {
    await TestBed.configureTestingModule({ imports: [WeatherCard] }).compileComponents();
    const fixture = TestBed.createComponent(WeatherCard);
    fixture.componentRef.setInput('city', city);
    fixture.componentRef.setInput('current', current);
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('Hanoi, Vietnam');
    expect(text).toContain('30°C');
    expect(text).toContain('Có mây');
    expect(text).toContain('6.8 km/h');
  });
});
