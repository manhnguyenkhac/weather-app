import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DailyForecast, weatherCodeLabel } from '../../core/weather-api';
import { UnitPreference, convertTemp } from '../../core/unit-preference';

@Component({
  selector: 'app-forecast-list',
  templateUrl: './forecast-list.html',
  styleUrl: './forecast-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForecastList {
  readonly days = input.required<DailyForecast[]>();

  private readonly pref = inject(UnitPreference);

  protected readonly label = weatherCodeLabel;

  // Danh sách đã quy đổi đơn vị — computed từ (days, unit), đổi unit là render lại tức thì
  protected readonly displayDays = computed(() => {
    const unit = this.pref.unit();
    return this.days().map((day) => ({
      ...day,
      tempMax: convertTemp(day.tempMax, unit),
      tempMin: convertTemp(day.tempMin, unit),
    }));
  });
}
