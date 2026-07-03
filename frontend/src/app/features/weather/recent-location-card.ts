import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { GeocodeResult, WeatherResponse, weatherCodeEmoji, weatherUrl } from '../../core/weather-api';
import { UnitPreference, convertTemp } from '../../core/unit-preference';

@Component({
  selector: 'app-recent-location-card',
  templateUrl: './recent-location-card.html',
  styleUrl: './recent-location-card.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentLocationCard {
  // input optional (không required) để httpResource idle an toàn trước khi binding sẵn sàng
  readonly city = input<GeocodeResult | undefined>(undefined);
  readonly chosen = output<GeocodeResult>();

  protected readonly pref = inject(UnitPreference);

  // Mỗi card tự fetch thời tiết hiện tại của nó — request trùng đã có cache backend đỡ
  protected readonly weather = httpResource<WeatherResponse>(() => {
    const c = this.city();
    return c ? weatherUrl(c.latitude, c.longitude, 1) : undefined;
  });

  protected readonly emoji = computed(() => {
    const w = this.weather.hasValue() ? this.weather.value() : undefined;
    return w ? weatherCodeEmoji(w.current.weatherCode) : '';
  });

  protected readonly temp = computed(() => {
    const w = this.weather.hasValue() ? this.weather.value() : undefined;
    return w ? convertTemp(w.current.temperature, this.pref.unit()) : null;
  });

  protected readonly realFeel = computed(() => {
    const w = this.weather.hasValue() ? this.weather.value() : undefined;
    return w ? convertTemp(w.current.apparentTemperature, this.pref.unit()) : null;
  });
}
