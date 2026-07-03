import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { WeatherApi } from './core/weather-api';
import { UnitPreference } from './core/unit-preference';
import { CitySearch } from './features/weather/city-search';
import { WeatherCard } from './features/weather/weather-card';
import { ForecastList } from './features/weather/forecast-list';

@Component({
  selector: 'app-root',
  imports: [CitySearch, WeatherCard, ForecastList],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly api = inject(WeatherApi);
  protected readonly pref = inject(UnitPreference);
  protected readonly title = signal('weather-app');
}
