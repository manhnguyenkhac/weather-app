import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import {
  DailyForecast,
  HourlyForecast,
  hourLabel,
  timeOfDay,
  uvLabel,
  weatherCodeEmoji,
  weatherCodeText,
  weekdayLabel,
} from '../../core/weather-api';
import { UnitPreference, convertTemp } from '../../core/unit-preference';
import { I18n } from '../../core/i18n';

@Component({
  selector: 'app-forecast-list',
  templateUrl: './forecast-list.html',
  styleUrl: './forecast-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForecastList {
  readonly days = input.required<DailyForecast[]>();
  // hourly cả dải ngày (24×days) — để lọc hourly riêng của ngày đang xổ
  readonly hours = input<HourlyForecast[]>([]);

  private readonly pref = inject(UnitPreference);
  protected readonly i18n = inject(I18n);

  // Ngày đang xổ chi tiết — bấm lại thì gập, bấm ngày khác thì chuyển
  readonly expandedDate = signal<string | null>(null);

  toggleDay(date: string): void {
    this.expandedDate.update((current) => (current === date ? null : date));
  }

  // Card theo ngày đã quy đổi đơn vị + nhãn thứ — computed từ (days, unit), đổi unit render lại tức thì
  protected readonly displayDays = computed(() => {
    const unit = this.pref.unit();
    const lang = this.i18n.lang();
    return this.days().map((day) => ({
      date: day.date,
      weekday: weekdayLabel(day.date, lang),
      dateShort: shortDate(day.date),
      emoji: weatherCodeEmoji(day.weatherCode),
      condition: weatherCodeText(day.weatherCode, lang),
      tempMax: convertTemp(day.tempMax, unit),
      tempMin: convertTemp(day.tempMin, unit),
    }));
  });

  // Chi tiết của ngày đang xổ (null khi gập)
  protected readonly detail = computed(() => {
    const date = this.expandedDate();
    if (!date) return null;
    const day = this.days().find((d) => d.date === date);
    if (!day) return null;

    const unit = this.pref.unit();
    const lang = this.i18n.lang();
    const dayHours = this.hours()
      .filter((h) => h.time.startsWith(date))
      .map((h) => ({
        label: hourLabel(h.time),
        emoji: weatherCodeEmoji(h.weatherCode),
        temperature: convertTemp(h.temperature, unit),
      }));

    return {
      title: `${weekdayLabel(date, lang)} ${shortDate(date)} — ${weatherCodeText(day.weatherCode, lang)}`,
      sunrise: timeOfDay(day.sunrise),
      sunset: timeOfDay(day.sunset),
      uv: day.uvIndexMax,
      uvLabel: uvLabel(day.uvIndexMax, lang),
      precipitation: day.precipitationSum,
      precipitationProbability: day.precipitationProbabilityMax,
      dayHours,
    };
  });
}

/** "2026-07-03" → "3/7" */
function shortDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return month && day ? `${Number(day)}/${Number(month)}` : isoDate;
}
