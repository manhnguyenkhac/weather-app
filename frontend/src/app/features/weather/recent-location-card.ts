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

  private readonly current = computed(() =>
    this.weather.hasValue() ? this.weather.value().current : undefined);

  protected readonly emoji = computed(() => {
    const c = this.current();
    return c ? weatherCodeEmoji(c.weatherCode) : '';
  });

  protected readonly temp = computed(() => {
    const c = this.current();
    return c ? convertTemp(c.temperature, this.pref.unit()) : null;
  });

  protected readonly realFeel = computed(() => {
    const c = this.current();
    return c ? convertTemp(c.apparentTemperature, this.pref.unit()) : null;
  });
}
