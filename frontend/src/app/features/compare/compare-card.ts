import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { httpResource } from '@angular/common/http';
import {
  AirQualityResponse,
  GeocodeResult,
  WeatherResponse,
  airQualityUrl,
  formatCityLabel,
  weatherCodeEmoji,
  weatherUrl,
} from '../../core/weather-api';
import { AQI_COLORS, aqiLevel } from '../../core/aqi';
import { UnitPreference, convertTemp } from '../../core/unit-preference';

@Component({
  selector: 'app-compare-card',
  templateUrl: './compare-card.html',
  styleUrl: './compare-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompareCard {
  // input optional để httpResource idle an toàn trước khi binding sẵn sàng
  readonly city = input<GeocodeResult | undefined>(undefined);
  readonly removed = output<GeocodeResult>();

  protected readonly pref = inject(UnitPreference);

  protected readonly weather = httpResource<WeatherResponse>(() => {
    const c = this.city();
    return c ? weatherUrl(c.latitude, c.longitude, 1) : undefined;
  });

  protected readonly air = httpResource<AirQualityResponse>(() => {
    const c = this.city();
    return c ? airQualityUrl(c.latitude, c.longitude) : undefined;
  });

  protected readonly label = computed(() => {
    const c = this.city();
    return c ? formatCityLabel(c) : '';
  });

  protected readonly data = computed(() => {
    if (!this.weather.hasValue()) return null;
    const w = this.weather.value();
    const unit = this.pref.unit();
    const today = w.daily[0];
    return {
      emoji: weatherCodeEmoji(w.current.weatherCode),
      temp: convertTemp(w.current.temperature, unit),
      realFeel: convertTemp(w.current.apparentTemperature, unit),
      max: today ? convertTemp(today.tempMax, unit) : null,
      min: today ? convertTemp(today.tempMin, unit) : null,
      rain: today?.precipitationSum ?? 0,
    };
  });

  protected readonly aqi = computed(() => {
    if (!this.air.hasValue()) return null;
    const value = this.air.value().current.usAqi;
    return { value, color: AQI_COLORS[aqiLevel(value)] };
  });
}
