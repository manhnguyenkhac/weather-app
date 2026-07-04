import { buildAlerts } from './weather-alerts';
import { AirQualityResponse, DailyForecast, WeatherResponse } from './weather-api';

function makeDay(overrides: Partial<DailyForecast> = {}): DailyForecast {
  return {
    date: '2026-07-04', tempMax: 30, tempMin: 25, weatherCode: 3,
    sunrise: '2026-07-04T05:19', sunset: '2026-07-04T18:43',
    uvIndexMax: 5, precipitationSum: 2, precipitationProbabilityMax: 20,
    ...overrides,
  };
}

function makeForecast(overrides: {
  day?: Partial<DailyForecast>;
  hourCodes?: number[];
  windSpeed?: number;
} = {}): WeatherResponse {
  const codes = overrides.hourCodes ?? Array(24).fill(3);
  return {
    current: { temperature: 30, apparentTemperature: 33, humidity: 70, windSpeed: overrides.windSpeed ?? 10, weatherCode: 3 },
    hourly: codes.map((code, i) => ({
      time: `2026-07-04T${String(i).padStart(2, '0')}:00`,
      temperature: 28,
      weatherCode: code,
    })),
    daily: [makeDay(overrides.day)],
  };
}

const badAir: AirQualityResponse = {
  current: { usAqi: 180, pm25: 90, pm10: 120, ozone: 60, nitrogenDioxide: 30, sulphurDioxide: 10, carbonMonoxide: 500 },
  hourly: [],
};

describe('buildAlerts', () => {
  it('thời tiết đẹp thì không có cảnh báo nào', () => {
    expect(buildAlerts(makeForecast())).toEqual([]);
  });

  it('dông trong 24h: danger, kèm giờ bắt đầu', () => {
    const codes = Array(24).fill(3);
    codes[14] = 96;
    const alerts = buildAlerts(makeForecast({ hourCodes: codes }));

    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('danger');
    expect(alerts[0].detail).toContain('14h');
  });

  it('mưa: 25mm là warning, 50mm nâng lên danger rất to', () => {
    expect(buildAlerts(makeForecast({ day: { precipitationSum: 25 } }))[0].severity).toBe('warning');
    const heavy = buildAlerts(makeForecast({ day: { precipitationSum: 50 } }))[0];
    expect(heavy.severity).toBe('danger');
    expect(heavy.title).toContain('rất to');
  });

  it('nắng nóng ≥37° danger, rét ≤10° warning, UV ≥8 warning, gió ≥40 warning', () => {
    expect(buildAlerts(makeForecast({ day: { tempMax: 37 } }))[0].title).toContain('Nắng nóng');
    expect(buildAlerts(makeForecast({ day: { tempMin: 10 } }))[0].title).toContain('Rét');
    expect(buildAlerts(makeForecast({ day: { uvIndexMax: 8 } }))[0].title).toContain('UV');
    expect(buildAlerts(makeForecast({ windSpeed: 40 }))[0].title).toContain('Gió');
  });

  it('AQI >150 thêm cảnh báo không khí; danger luôn xếp trước warning', () => {
    const alerts = buildAlerts(makeForecast({ day: { uvIndexMax: 9 } }), badAir);

    expect(alerts).toHaveLength(2);
    expect(alerts[0].severity).toBe('danger'); // AQI 180
    expect(alerts[0].title).toContain('Không khí');
    expect(alerts[1].title).toContain('UV');
  });

  it('dưới ngưỡng một chút thì không kêu (24.9mm, 36.9°, AQI 150)', () => {
    expect(buildAlerts(makeForecast({ day: { precipitationSum: 24.9, tempMax: 36.9 } }))).toEqual([]);
    const okAir = { ...badAir, current: { ...badAir.current, usAqi: 150 } };
    expect(buildAlerts(makeForecast(), okAir)).toEqual([]);
  });
});
