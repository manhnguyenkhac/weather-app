import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { CurrentWeather, GeocodeResult, formatCityLabel, weatherCodeEmoji, weatherCodeText } from '../../core/weather-api';
import { UnitPreference, convertTemp } from '../../core/unit-preference';
import { I18n } from '../../core/i18n';

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
  protected readonly i18n = inject(I18n);

  protected readonly cityLabel = computed(() => formatCityLabel(this.city()));

  protected readonly emoji = computed(() => weatherCodeEmoji(this.current().weatherCode));
  protected readonly conditionText = computed(() => weatherCodeText(this.current().weatherCode, this.i18n.lang()));

  // Đổi đơn vị là giá trị tự tính lại tức thì — không reload, không gọi lại API
  protected readonly displayTemperature = computed(() =>
    convertTemp(this.current().temperature, this.pref.unit()));

  protected readonly displayRealFeel = computed(() =>
    convertTemp(this.current().apparentTemperature, this.pref.unit()));
}
