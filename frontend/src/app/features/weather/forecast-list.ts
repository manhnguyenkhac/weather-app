import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DailyForecast, weatherCodeEmoji, weatherCodeText, weekdayLabel } from '../../core/weather-api';
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

  // Card theo ngày đã quy đổi đơn vị + nhãn thứ — computed từ (days, unit), đổi unit render lại tức thì
  protected readonly displayDays = computed(() => {
    const unit = this.pref.unit();
    return this.days().map((day) => ({
      date: day.date,
      weekday: weekdayLabel(day.date),
      dateShort: shortDate(day.date),
      emoji: weatherCodeEmoji(day.weatherCode),
      condition: weatherCodeText(day.weatherCode),
      tempMax: convertTemp(day.tempMax, unit),
      tempMin: convertTemp(day.tempMin, unit),
    }));
  });
}

/** "2026-07-03" → "3/7" */
function shortDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return month && day ? `${Number(day)}/${Number(month)}` : isoDate;
}
