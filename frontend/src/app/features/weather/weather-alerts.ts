import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { WeatherApi } from '../../core/weather-api';
import { buildAlerts } from '../../core/weather-alerts';
import { I18n } from '../../core/i18n';
import { UnitPreference } from '../../core/unit-preference';

@Component({
  selector: 'app-weather-alerts',
  templateUrl: './weather-alerts.html',
  styleUrl: './weather-alerts.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherAlerts {
  private readonly api = inject(WeatherApi);
  private readonly i18n = inject(I18n);
  private readonly pref = inject(UnitPreference);

  protected readonly alerts = computed(() => {
    if (!this.api.forecast.hasValue()) return [];
    const airQuality = this.api.airQuality.hasValue() ? this.api.airQuality.value() : undefined;
    return buildAlerts(this.api.forecast.value(), airQuality, this.i18n.lang(), this.pref.unit());
  });
}
