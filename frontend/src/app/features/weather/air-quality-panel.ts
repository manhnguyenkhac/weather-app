import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { WeatherApi } from '../../core/weather-api';
import {
  AQI_BOUNDS,
  AQI_COLORS,
  AqiLevel,
  GAUGE,
  aqiAdvice,
  aqiHeadline,
  aqiLevel,
  aqiLevelName,
  gaugeArcPath,
  gaugeAngle,
  gaugeNeedle,
  gaugeSegments,
  whoPercent,
  whoTimes,
} from '../../core/aqi';

interface PollutantTile {
  key: string;
  label: string;
  value: number;
  percent: number;
  color: string;
  main: boolean;
}

interface HourBar {
  label: string;
  heightPercent: number;
  color: string;
  title: string;
}

@Component({
  selector: 'app-air-quality-panel',
  templateUrl: './air-quality-panel.html',
  styleUrl: './air-quality-panel.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AirQualityPanel {
  protected readonly api = inject(WeatherApi);

  // Mặc định thu gọn — bấm header mới xổ chi tiết (feedback user #38)
  readonly expanded = signal(false);

  // Hình học gauge — hằng số dùng trong template
  protected readonly gauge = GAUGE;
  protected readonly segments = gaugeSegments();

  protected readonly legend = ([1, 2, 3, 4, 5, 6] as const).map((l) => ({
    color: AQI_COLORS[l],
    range: l === 6 ? '301–500+' : `${AQI_BOUNDS[l - 1] + (l > 1 ? 1 : 0)}–${AQI_BOUNDS[l]}`,
    name: aqiLevelName(l),
  }));

  private readonly data = computed(() =>
    this.api.airQuality.hasValue() ? this.api.airQuality.value() : undefined);

  protected readonly aqi = computed(() => this.data()?.current.usAqi ?? null);
  protected readonly level = computed<AqiLevel>(() => aqiLevel(this.aqi() ?? 0));
  protected readonly levelColor = computed(() => AQI_COLORS[this.level()]);
  protected readonly levelName = computed(() => aqiLevelName(this.level()));
  protected readonly headline = computed(() => aqiHeadline(this.level()));
  protected readonly advice = computed(() => aqiAdvice(this.level()));

  // Cung "đã đi qua" + vị trí kim
  protected readonly doneArc = computed(() =>
    gaugeArcPath(0, Math.max(gaugeAngle(this.aqi() ?? 0), 2)));
  protected readonly needle = computed(() => gaugeNeedle(this.aqi() ?? 0));

  // Chất ô nhiễm chính = chất có % so ngưỡng WHO cao nhất
  protected readonly tiles = computed<PollutantTile[]>(() => {
    const c = this.data()?.current;
    if (!c) return [];
    const defs: [string, string, number][] = [
      ['pm25', 'PM2.5', c.pm25],
      ['pm10', 'PM10', c.pm10],
      ['ozone', 'O₃', c.ozone],
      ['nitrogenDioxide', 'NO₂', c.nitrogenDioxide],
      ['sulphurDioxide', 'SO₂', c.sulphurDioxide],
      ['carbonMonoxide', 'CO', c.carbonMonoxide],
    ];
    const maxKey = defs.reduce((best, d) => (whoTimes(d[0], d[2]) > whoTimes(best[0], best[2]) ? d : best))[0];
    return defs.map(([key, label, value]) => {
      const percent = whoPercent(key, value);
      const barLevel: AqiLevel = percent >= 100 ? 4 : percent >= 75 ? 3 : percent >= 50 ? 2 : 1;
      return { key, label, value, percent, color: AQI_COLORS[barLevel], main: key === maxKey };
    });
  });

  protected readonly mainTile = computed(() => this.tiles().find((t) => t.main));
  protected readonly mainTimes = computed(() => {
    const t = this.mainTile();
    return t ? whoTimes(t.key, t.value) : 0;
  });

  protected readonly hourBars = computed<HourBar[]>(() => {
    const hours = this.data()?.hourly ?? [];
    if (hours.length === 0) return [];
    const max = Math.max(200, ...hours.map((h) => h.usAqi));
    return hours.map((h) => {
      const hourLabel = `${Number((h.time.split('T')[1] ?? '').slice(0, 2))}h`;
      return {
        label: hourLabel,
        heightPercent: Math.max(6, Math.round((h.usAqi / max) * 100)),
        color: AQI_COLORS[aqiLevel(h.usAqi)],
        title: `${hourLabel} — AQI ${h.usAqi}`,
      };
    });
  });
}
