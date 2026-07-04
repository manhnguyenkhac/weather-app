import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { WeatherApi } from './core/weather-api';
import { UnitPreference } from './core/unit-preference';
import { CitySearch } from './features/weather/city-search';
import { WeatherCard } from './features/weather/weather-card';
import { WeatherAlerts } from './features/weather/weather-alerts';
import { HourlyStrip } from './features/weather/hourly-strip';
import { TemperatureChart } from './features/weather/temperature-chart';
import { ForecastList } from './features/weather/forecast-list';
import { AirQualityPanel } from './features/weather/air-quality-panel';
import { RecentLocationList } from './features/weather/recent-location-list';
import { RainMap } from './features/map/rain-map';
import { ComparePanel } from './features/compare/compare-panel';
import { Sidebar } from './features/shell/sidebar';

@Component({
  selector: 'app-root',
  imports: [CitySearch, WeatherCard, WeatherAlerts, AirQualityPanel, HourlyStrip, TemperatureChart, ForecastList, RecentLocationList, RainMap, ComparePanel, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly api = inject(WeatherApi);
  protected readonly pref = inject(UnitPreference);
  protected readonly title = signal('weather-app');
  protected readonly sidebarOpen = signal(false);
}
