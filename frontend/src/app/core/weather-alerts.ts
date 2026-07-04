// Cảnh báo thời tiết xấu — hàm thuần suy ra từ dữ liệu sẵn có, test không cần Angular.

import { AirQualityResponse, WeatherResponse, hourLabel } from './weather-api';

export type AlertSeverity = 'warning' | 'danger';

export interface WeatherAlert {
  severity: AlertSeverity;
  emoji: string;
  title: string;
  detail: string;
}

// Ngưỡng cảnh báo (đơn vị gốc: °C, mm, km/h, US AQI)
const THUNDER_CODE = 95; // WMO ≥95 = dông
const RAIN_WARNING_MM = 25;
const RAIN_DANGER_MM = 50;
const HEAT_C = 37;
const COLD_C = 10;
const UV_HIGH = 8;
const AQI_BAD = 150;
const WIND_KMH = 40;

type Lang = 'vi' | 'en';

const TEXTS = {
  vi: {
    thunderTitle: 'Dông trong 24 giờ tới',
    thunderDetail: (hour: string) => `Bắt đầu khoảng ${hour} — tránh khu vực trống trải khi có sấm sét.`,
    rainTitle: 'Mưa to hôm nay',
    rainDangerTitle: 'Mưa rất to hôm nay',
    rainDetail: (mm: number, p: number) => `Dự kiến ~${mm} mm (xác suất ${p}%) — đề phòng ngập úng cục bộ.`,
    heatTitle: 'Nắng nóng gay gắt',
    heatDetail: (t: number) => `Nhiệt độ cao nhất ~${t}°C — uống đủ nước, tránh ra ngoài giữa trưa.`,
    coldTitle: 'Rét đậm',
    coldDetail: (t: number) => `Nhiệt độ thấp nhất ~${t}°C — giữ ấm, đặc biệt người già và trẻ nhỏ.`,
    uvTitle: 'UV rất cao',
    uvDetail: (uv: number) => `Chỉ số UV ~${uv} — che chắn, dùng kem chống nắng khi ra ngoài.`,
    windTitle: 'Gió mạnh',
    windDetail: (v: number) => `Gió hiện tại ${v} km/h — cẩn thận vật rơi, hạn chế đi xe máy đường trống.`,
    airTitle: 'Không khí xấu',
    airDetail: (aqi: number) => `AQI ${aqi} — đeo khẩu trang đạt chuẩn, hạn chế hoạt động ngoài trời.`,
  },
  en: {
    thunderTitle: 'Thunderstorm within 24 hours',
    thunderDetail: (hour: string) => `Starting around ${hour} — avoid open areas during lightning.`,
    rainTitle: 'Heavy rain today',
    rainDangerTitle: 'Very heavy rain today',
    rainDetail: (mm: number, p: number) => `Expected ~${mm} mm (${p}% chance) — watch for local flooding.`,
    heatTitle: 'Extreme heat',
    heatDetail: (t: number) => `High of ~${t}°C — stay hydrated, avoid midday sun.`,
    coldTitle: 'Severe cold',
    coldDetail: (t: number) => `Low of ~${t}°C — keep warm, especially the elderly and children.`,
    uvTitle: 'Very high UV',
    uvDetail: (uv: number) => `UV index ~${uv} — cover up and use sunscreen outdoors.`,
    windTitle: 'Strong wind',
    windDetail: (v: number) => `Current wind ${v} km/h — beware of falling objects, take care on open roads.`,
    airTitle: 'Bad air quality',
    airDetail: (aqi: number) => `AQI ${aqi} — wear a certified mask, limit outdoor activity.`,
  },
} as const;

/** Suy cảnh báo từ forecast (24h tới + hôm nay) và AQI hiện tại. Trả mảng đã sort: danger trước. */
export function buildAlerts(forecast: WeatherResponse, airQuality?: AirQualityResponse, lang: Lang = 'vi'): WeatherAlert[] {
  const t = TEXTS[lang];
  const alerts: WeatherAlert[] = [];
  const today = forecast.daily[0];
  const next24 = forecast.hourly.slice(0, 24);

  const firstThunder = next24.find((h) => h.weatherCode >= THUNDER_CODE);
  if (firstThunder) {
    alerts.push({
      severity: 'danger',
      emoji: '⛈️',
      title: t.thunderTitle,
      detail: t.thunderDetail(hourLabel(firstThunder.time)),
    });
  }

  if (today && today.precipitationSum >= RAIN_WARNING_MM) {
    const danger = today.precipitationSum >= RAIN_DANGER_MM;
    alerts.push({
      severity: danger ? 'danger' : 'warning',
      emoji: '🌧️',
      title: danger ? t.rainDangerTitle : t.rainTitle,
      detail: t.rainDetail(today.precipitationSum, today.precipitationProbabilityMax),
    });
  }

  if (today && today.tempMax >= HEAT_C) {
    alerts.push({ severity: 'danger', emoji: '🥵', title: t.heatTitle, detail: t.heatDetail(today.tempMax) });
  }

  if (today && today.tempMin <= COLD_C) {
    alerts.push({ severity: 'warning', emoji: '🥶', title: t.coldTitle, detail: t.coldDetail(today.tempMin) });
  }

  if (today && today.uvIndexMax >= UV_HIGH) {
    alerts.push({ severity: 'warning', emoji: '☀️', title: t.uvTitle, detail: t.uvDetail(today.uvIndexMax) });
  }

  if (forecast.current.windSpeed >= WIND_KMH) {
    alerts.push({ severity: 'warning', emoji: '💨', title: t.windTitle, detail: t.windDetail(forecast.current.windSpeed) });
  }

  if (airQuality && airQuality.current.usAqi > AQI_BAD) {
    alerts.push({ severity: 'danger', emoji: '😷', title: t.airTitle, detail: t.airDetail(airQuality.current.usAqi) });
  }

  // danger nổi lên trước
  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'danger' ? -1 : 1));
}
