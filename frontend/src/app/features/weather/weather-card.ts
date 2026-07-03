import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CurrentWeather, GeocodeResult, weatherCodeLabel } from '../../core/weather-api';

@Component({
  selector: 'app-weather-card',
  templateUrl: './weather-card.html',
  styleUrl: './weather-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherCard {
  readonly city = input.required<GeocodeResult>();
  readonly current = input.required<CurrentWeather>();

  protected readonly conditionLabel = computed(() => weatherCodeLabel(this.current().weatherCode));
}
