import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CurrentWeather, GeocodeResult, weatherCodeLabel } from '../../core/weather-api';
import { UnitPreference, convertTemp } from '../../core/unit-preference';

@Component({
  selector: 'app-weather-card',
  templateUrl: './weather-card.html',
  styleUrl: './weather-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeatherCard {
  readonly city = input.required<GeocodeResult>();
  readonly current = input.required<CurrentWeather>();

  protected readonly pref = inject(UnitPreference);

  protected readonly conditionLabel = computed(() => weatherCodeLabel(this.current().weatherCode));

  // Đổi đơn vị là giá trị tự tính lại tức thì — không reload, không gọi lại API
  protected readonly displayTemperature = computed(() =>
    convertTemp(this.current().temperature, this.pref.unit()));
}
