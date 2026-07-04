import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { WeatherApi } from '../../core/weather-api';
import { buildAlerts } from '../../core/weather-alerts';

@Component({
  selector: 'app-weather-alerts',
  templateUrl: './weather-alerts.html',
  styleUrl: './weather-alerts.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherAlerts {
  private readonly api = inject(WeatherApi);

  protected readonly alerts = computed(() => {
    if (!this.api.forecast.hasValue()) return [];
    const airQuality = this.api.airQuality.hasValue() ? this.api.airQuality.value() : undefined;
    return buildAlerts(this.api.forecast.value(), airQuality);
  });
}
