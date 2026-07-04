import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CurrentWeather, DailyForecast, HourlyForecast, currentHourIndex, hourLabel, weekdayLabel } from '../../core/weather-api';
import { ChartFrame, areaPath, linePath, linePoints, niceDomain, scaleLinear } from '../../core/chart';
import { UnitPreference, convertTemp } from '../../core/unit-preference';
import { I18n } from '../../core/i18n';

const LINE_FRAME: ChartFrame = { width: 560, height: 170, padLeft: 34, padRight: 14, padTop: 16, padBottom: 24 };
const RANGE_FRAME: ChartFrame = { width: 560, height: 150, padLeft: 10, padRight: 10, padTop: 22, padBottom: 24 };

@Component({
  selector: 'app-temperature-chart',
  templateUrl: './temperature-chart.html',
  styleUrl: './temperature-chart.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemperatureChart {
  readonly hours = input.required<HourlyForecast[]>();
  readonly days = input.required<DailyForecast[]>();
  // Mốc "bây giờ" — thiếu thì fallback đầu mảng (hành vi cũ)
  readonly current = input<CurrentWeather | undefined>(undefined);

  protected readonly pref = inject(UnitPreference);
  protected readonly i18n = inject(I18n);
  protected readonly lineFrame = LINE_FRAME;
  protected readonly rangeFrame = RANGE_FRAME;

  // Giờ đang hover trên biểu đồ đường (null = không hover)
  readonly hoverIndex = signal<number | null>(null);

  // "24 giờ TỚI" thật: hourly bắt đầu từ 00:00 giờ địa phương — trượt tới giờ hiện tại (#74)
  private readonly hours24 = computed(() => {
    const current = this.current();
    const start = current ? currentHourIndex(current, this.hours()) : 0;
    return this.hours().slice(start, start + 24);
  });

  // ===== Biểu đồ đường 24h =====
  protected readonly line = computed(() => {
    const unit = this.pref.unit();
    const items = this.hours24();
    if (items.length < 2) return null;

    const temps = items.map((h) => convertTemp(h.temperature, unit));
    const domain = niceDomain(temps);
    const points = linePoints(temps, LINE_FRAME, domain);

    // gridline: min / giữa / max của miền
    const mid = Math.round((domain.min + domain.max) / 2);
    const yTicks = [domain.min, mid, domain.max].map((value) => ({
      value,
      y: Math.round(scaleLinear(value, domain.min, domain.max, LINE_FRAME.height - LINE_FRAME.padBottom, LINE_FRAME.padTop) * 10) / 10,
    }));

    // nhãn trục giờ thưa: mỗi 6 điểm + điểm cuối
    const xTicks = points
      .filter((p) => p.index % 6 === 0 || p.index === points.length - 1)
      .map((p) => ({ x: p.x, label: hourLabel(items[p.index].time) }));

    // label trực tiếp CHỌN LỌC: chỉ điểm nóng nhất và lạnh nhất
    const hottest = points.reduce((a, b) => (b.value > a.value ? b : a));
    const coldest = points.reduce((a, b) => (b.value < a.value ? b : a));

    return {
      path: linePath(points),
      area: areaPath(points, LINE_FRAME),
      points,
      yTicks,
      xTicks,
      extremes: hottest.index === coldest.index ? [hottest] : [hottest, coldest],
      labels: items.map((h) => hourLabel(h.time)),
    };
  });

  protected readonly hoverPoint = computed(() => {
    const line = this.line();
    const index = this.hoverIndex();
    if (!line || index === null || index < 0 || index >= line.points.length) return null;
    return { ...line.points[index], label: line.labels[index] };
  });

  /** Từ tọa độ chuột (px trong viewBox) suy ra điểm gần nhất. */
  onLineMove(event: MouseEvent): void {
    const line = this.line();
    if (!line) return;
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const viewX = ((event.clientX - rect.left) / rect.width) * LINE_FRAME.width;
    const usable = LINE_FRAME.width - LINE_FRAME.padLeft - LINE_FRAME.padRight;
    const ratio = (viewX - LINE_FRAME.padLeft) / usable;
    const index = Math.round(ratio * (line.points.length - 1));
    this.hoverIndex.set(Math.max(0, Math.min(line.points.length - 1, index)));
  }

  // ===== Dải min–max 7 ngày =====
  protected readonly rangeBars = computed(() => {
    const unit = this.pref.unit();
    const items = this.days();
    if (items.length === 0) return [];

    const temps = items.flatMap((d) => [convertTemp(d.tempMin, unit), convertTemp(d.tempMax, unit)]);
    const domain = niceDomain(temps);
    const slot = (RANGE_FRAME.width - RANGE_FRAME.padLeft - RANGE_FRAME.padRight) / items.length;
    const yBottom = RANGE_FRAME.height - RANGE_FRAME.padBottom;
    const yFor = (v: number) =>
      Math.round(scaleLinear(v, domain.min, domain.max, yBottom, RANGE_FRAME.padTop) * 10) / 10;

    return items.map((day, i) => {
      const max = convertTemp(day.tempMax, unit);
      const min = convertTemp(day.tempMin, unit);
      const x = Math.round((RANGE_FRAME.padLeft + slot * i + slot / 2) * 10) / 10;
      return {
        date: day.date,
        weekday: weekdayLabel(day.date, this.i18n.lang()),
        x,
        yMax: yFor(max),
        yMin: yFor(min),
        max,
        min,
      };
    });
  });
}
