import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { HistoryResponse, WeatherApi, historyUrl } from '../../core/weather-api';
import { ChartFrame, linePath, linePoints, niceDomain } from '../../core/chart';
import { UnitPreference, convertTemp } from '../../core/unit-preference';
import { I18n } from '../../core/i18n';

const FRAME: ChartFrame = { width: 560, height: 170, padLeft: 34, padRight: 14, padTop: 14, padBottom: 24 };

/** Xu hướng & lịch sử (#71) — 30 ngày qua + so hôm nay với trung bình 10 năm cùng thời điểm. */
@Component({
  selector: 'app-history-panel',
  templateUrl: './history-panel.html',
  styleUrl: './history-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistoryPanel {
  protected readonly api = inject(WeatherApi);
  protected readonly pref = inject(UnitPreference);
  protected readonly i18n = inject(I18n);

  // Thu gọn mặc định — chỉ fetch archive (nặng) khi user mở panel lần đầu
  readonly expanded = signal(false);

  protected readonly frame = FRAME;

  protected readonly history = httpResource<HistoryResponse>(() => {
    const city = this.api.selectedCity();
    return this.expanded() && city ? historyUrl(city.latitude, city.longitude) : undefined;
  });

  private readonly data = computed(() =>
    this.history.hasValue() ? this.history.value() : undefined);

  /** "Hôm nay 35° — nóng hơn trung bình 10 năm ~3°C" — so tempMax forecast hôm nay với normal. */
  protected readonly verdict = computed(() => {
    const normal = this.data()?.normal;
    if (!normal || !this.api.forecast.hasValue()) return null;
    const today = this.api.forecast.value().daily[0];
    if (!today) return null;

    const delta = Math.round((today.tempMax - normal.tempMax) * 10) / 10;
    const unit = this.pref.unit();
    // Chênh lệch °C→°F chỉ nhân 1.8 (không cộng 32 — đây là HIỆU nhiệt độ)
    const displayDelta = unit === 'F' ? Math.round(delta * 1.8 * 10) / 10 : delta;
    const key = delta >= 1 ? 'history.hotter' : delta <= -1 ? 'history.colder' : 'history.similar';
    return {
      emoji: delta >= 1 ? '🔥' : delta <= -1 ? '❄️' : '≈',
      text: this.i18n.t(key, { x: Math.abs(displayDelta), today: convertTemp(today.tempMax, unit), normal: convertTemp(normal.tempMax, unit) }),
    };
  });

  /** 2 polyline max/min của 30 ngày, đã quy đổi đơn vị. */
  protected readonly chart = computed(() => {
    const days = this.data()?.days ?? [];
    if (days.length < 2) return null;

    const unit = this.pref.unit();
    const maxes = days.map((d) => convertTemp(d.tempMax, unit));
    const mins = days.map((d) => convertTemp(d.tempMin, unit));
    const domain = niceDomain([...maxes, ...mins]);
    const maxPoints = linePoints(maxes, FRAME, domain);
    const minPoints = linePoints(mins, FRAME, domain);

    const yTicks = [domain.min, Math.round((domain.min + domain.max) / 2), domain.max].map((value) => ({
      value,
      y: linePoints([value], FRAME, domain)[0].y,
    }));
    // Nhãn ngày đầu / giữa / cuối là đủ đọc cho 30 điểm
    const xTicks = [0, Math.floor((days.length - 1) / 2), days.length - 1].map((i) => ({
      label: shortDay(days[i].date),
      x: maxPoints[i].x,
    }));

    return {
      maxPath: linePath(maxPoints),
      minPath: linePath(minPoints),
      yTicks,
      xTicks,
    };
  });

  /** Tổng mưa 30 ngày (mm) — làm tròn 1 số lẻ. */
  protected readonly totalRain = computed(() => {
    const days = this.data()?.days ?? [];
    if (days.length === 0) return null;
    return Math.round(days.reduce((sum, d) => sum + d.precipitation, 0) * 10) / 10;
  });
}

/** "2026-06-05" → "5/6" */
function shortDay(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${Number(day)}/${Number(month)}`;
}
