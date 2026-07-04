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

/** Suy cảnh báo từ forecast (24h tới + hôm nay) và AQI hiện tại. Trả mảng đã sort: danger trước. */
export function buildAlerts(forecast: WeatherResponse, airQuality?: AirQualityResponse): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const today = forecast.daily[0];
  const next24 = forecast.hourly.slice(0, 24);

  const firstThunder = next24.find((h) => h.weatherCode >= THUNDER_CODE);
  if (firstThunder) {
    alerts.push({
      severity: 'danger',
      emoji: '⛈️',
      title: 'Dông trong 24 giờ tới',
      detail: `Bắt đầu khoảng ${hourLabel(firstThunder.time)} — tránh khu vực trống trải khi có sấm sét.`,
    });
  }

  if (today && today.precipitationSum >= RAIN_WARNING_MM) {
    const danger = today.precipitationSum >= RAIN_DANGER_MM;
    alerts.push({
      severity: danger ? 'danger' : 'warning',
      emoji: '🌧️',
      title: danger ? 'Mưa rất to hôm nay' : 'Mưa to hôm nay',
      detail: `Dự kiến ~${today.precipitationSum} mm (xác suất ${today.precipitationProbabilityMax}%) — đề phòng ngập úng cục bộ.`,
    });
  }

  if (today && today.tempMax >= HEAT_C) {
    alerts.push({
      severity: 'danger',
      emoji: '🥵',
      title: 'Nắng nóng gay gắt',
      detail: `Nhiệt độ cao nhất ~${today.tempMax}°C — uống đủ nước, tránh ra ngoài giữa trưa.`,
    });
  }

  if (today && today.tempMin <= COLD_C) {
    alerts.push({
      severity: 'warning',
      emoji: '🥶',
      title: 'Rét đậm',
      detail: `Nhiệt độ thấp nhất ~${today.tempMin}°C — giữ ấm, đặc biệt người già và trẻ nhỏ.`,
    });
  }

  if (today && today.uvIndexMax >= UV_HIGH) {
    alerts.push({
      severity: 'warning',
      emoji: '☀️',
      title: 'UV rất cao',
      detail: `Chỉ số UV ~${today.uvIndexMax} — che chắn, dùng kem chống nắng khi ra ngoài.`,
    });
  }

  if (forecast.current.windSpeed >= WIND_KMH) {
    alerts.push({
      severity: 'warning',
      emoji: '💨',
      title: 'Gió mạnh',
      detail: `Gió hiện tại ${forecast.current.windSpeed} km/h — cẩn thận vật rơi, hạn chế đi xe máy đường trống.`,
    });
  }

  if (airQuality && airQuality.current.usAqi > AQI_BAD) {
    alerts.push({
      severity: 'danger',
      emoji: '😷',
      title: 'Không khí xấu',
      detail: `AQI ${airQuality.current.usAqi} — đeo khẩu trang đạt chuẩn, hạn chế hoạt động ngoài trời.`,
    });
  }

  // danger nổi lên trước
  return alerts.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'danger' ? -1 : 1));
}
