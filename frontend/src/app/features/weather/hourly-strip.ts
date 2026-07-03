import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { HourlyForecast, hourLabel, weatherCodeEmoji } from '../../core/weather-api';
import { UnitPreference, convertTemp } from '../../core/unit-preference';

@Component({
  selector: 'app-hourly-strip',
  templateUrl: './hourly-strip.html',
  styleUrl: './hourly-strip.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HourlyStrip {
  readonly hours = input.required<HourlyForecast[]>();

  private readonly pref = inject(UnitPreference);

  // Danh sách đã quy đổi đơn vị + nhãn giờ — computed từ (hours, unit)
  protected readonly displayHours = computed(() => {
    const unit = this.pref.unit();
    return this.hours().map((hour) => ({
      label: hourLabel(hour.time),
      emoji: weatherCodeEmoji(hour.weatherCode),
      temperature: convertTemp(hour.temperature, unit),
    }));
  });
}
