import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { HourlyForecast, hourLabel, weatherCodeEmoji } from '../../core/weather-api';
import { UnitPreference, convertTemp } from '../../core/unit-preference';
import { I18n } from '../../core/i18n';

@Component({
  selector: 'app-hourly-strip',
  templateUrl: './hourly-strip.html',
  styleUrl: './hourly-strip.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HourlyStrip {
  readonly hours = input.required<HourlyForecast[]>();
  // hourly giờ phủ cả dải ngày (24×days) — dải chính chỉ hiện limit giờ đầu
  readonly limit = input(24);

  private readonly pref = inject(UnitPreference);
  protected readonly i18n = inject(I18n);

  // Danh sách đã quy đổi đơn vị + nhãn giờ — computed từ (hours, unit)
  protected readonly displayHours = computed(() => {
    const unit = this.pref.unit();
    return this.hours().slice(0, this.limit()).map((hour) => ({
      label: hourLabel(hour.time),
      emoji: weatherCodeEmoji(hour.weatherCode),
      temperature: convertTemp(hour.temperature, unit),
    }));
  });
}
