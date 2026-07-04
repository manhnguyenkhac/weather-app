// Logic domain cho US AQI — hàm thuần, test không cần Angular.

export type AqiLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** Ngưỡng trên của từng mức US AQI (mức 6 hở trần, dùng 500 làm trần gauge). */
export const AQI_BOUNDS = [0, 50, 100, 150, 200, 300, 500] as const;

/** Màu 6 mức (light theme) — đã qua validator CVD: deutan/tritan ΔE ≥ 12, kèm quy tắc luôn hiển thị số + nhãn. */
export const AQI_COLORS: Record<AqiLevel, string> = {
  1: '#35A05F',
  2: '#C79B05',
  3: '#C65A11',
  4: '#B22D35',
  5: '#7B5EA7',
  6: '#93374E',
};

export function aqiLevel(aqi: number): AqiLevel {
  if (aqi <= 50) return 1;
  if (aqi <= 100) return 2;
  if (aqi <= 150) return 3;
  if (aqi <= 200) return 4;
  if (aqi <= 300) return 5;
  return 6;
}

export function aqiLevelName(level: AqiLevel, lang: 'vi' | 'en' = 'vi'): string {
  const names = lang === 'vi'
    ? ['Tốt', 'Trung bình', 'Kém (nhóm nhạy cảm)', 'Xấu', 'Rất xấu', 'Nguy hại']
    : ['Good', 'Moderate', 'Unhealthy (sensitive)', 'Unhealthy', 'Very unhealthy', 'Hazardous'];
  return names[level - 1];
}

/** Headline hành động — nói người dùng NÊN LÀM GÌ, không chỉ mô tả. */
export function aqiHeadline(level: AqiLevel, lang: 'vi' | 'en' = 'vi'): string {
  const headlines = lang === 'vi'
    ? [
        'Không khí sạch — thoải mái hoạt động ngoài trời',
        'Chấp nhận được — nhóm quá nhạy cảm nên để ý triệu chứng',
        'Nhóm nhạy cảm nên giảm hoạt động ngoài trời',
        'Mọi người nên hạn chế hoạt động gắng sức ngoài trời',
        'Tránh ra ngoài — không khí ảnh hưởng sức khỏe mọi người',
        'Nguy hiểm — ở trong nhà, đóng kín cửa, dùng lọc không khí',
      ]
    : [
        'Clean air — enjoy outdoor activities',
        'Acceptable — highly sensitive people should watch for symptoms',
        'Sensitive groups should reduce outdoor activity',
        'Everyone should limit strenuous outdoor activity',
        'Avoid going outside — air affects everyone’s health',
        'Dangerous — stay indoors, close windows, use an air purifier',
      ];
  return headlines[level - 1];
}

export function aqiAdvice(level: AqiLevel, lang: 'vi' | 'en' = 'vi'): string[] {
  const byLevel: string[][] = lang === 'vi'
    ? [
        ['🏃 Thời điểm tốt cho chạy bộ, đạp xe ngoài trời', '🪟 Mở cửa sổ thông gió thoải mái'],
        ['😌 Hoạt động ngoài trời bình thường', '👶 Trẻ nhỏ/người hen suyễn để ý nếu thấy khó chịu'],
        ['😷 Nên đeo khẩu trang đạt chuẩn khi ra đường lâu', '🪟 Người hen suyễn, trẻ nhỏ, người già: hạn chế mở cửa sổ giờ cao điểm'],
        ['😷 Đeo khẩu trang đạt chuẩn khi ra đường', '🏠 Cân nhắc tập luyện trong nhà thay vì ngoài trời'],
        ['🚫 Hoãn hoạt động ngoài trời nếu có thể', '🌬️ Đóng cửa sổ, bật lọc không khí nếu có'],
        ['🏠 Ở trong nhà, đóng kín cửa', '🩺 Có triệu chứng khó thở/đau ngực: liên hệ y tế'],
      ]
    : [
        ['🏃 Great time for running or cycling outdoors', '🪟 Open windows and ventilate freely'],
        ['😌 Outdoor activities as usual', '👶 Kids/asthmatics: watch for any discomfort'],
        ['😷 Wear a certified mask for long time outdoors', '🪟 Asthmatics, kids, elderly: limit opening windows at peak hours'],
        ['😷 Wear a certified mask outdoors', '🏠 Consider indoor workouts instead'],
        ['🚫 Postpone outdoor activities if possible', '🌬️ Close windows, run an air purifier if available'],
        ['🏠 Stay indoors, keep doors and windows shut', '🩺 Breathing trouble or chest pain: seek medical help'],
      ];
  return byLevel[level - 1];
}

/** Ngưỡng WHO 2021 (24h, riêng O₃ 8h và CO mg-quy-đổi) — µg/m³. */
export const WHO_GUIDELINES: Record<string, number> = {
  pm25: 15,
  pm10: 45,
  ozone: 100,
  nitrogenDioxide: 25,
  sulphurDioxide: 40,
  carbonMonoxide: 4000,
};

/** % so ngưỡng WHO, kẹp trần 100 cho thanh hiển thị. */
export function whoPercent(pollutant: keyof typeof WHO_GUIDELINES | string, value: number): number {
  const guideline = WHO_GUIDELINES[pollutant];
  if (!guideline || value <= 0) return 0;
  return Math.min(100, Math.round((value / guideline) * 100));
}

/** Bội số so ngưỡng WHO (1 chữ số lẻ) — hiển thị "gấp 3.2×". */
export function whoTimes(pollutant: string, value: number): number {
  const guideline = WHO_GUIDELINES[pollutant];
  if (!guideline || value <= 0) return 0;
  return Math.round((value / guideline) * 10) / 10;
}

// ===== Hình học gauge: cung 210°, 6 segment đều nhau (mỗi segment = 1 mức) =====

export const GAUGE = { cx: 107.5, cy: 122, r: 88, width: 13, start: 195, sweep: 210, segGap: 1.6 } as const;

/** Góc quét (0..210) ứng với giá trị AQI — vị trí trong segment = vị trí trong khoảng mức. */
export function gaugeAngle(aqi: number): number {
  const clamped = Math.max(0, Math.min(aqi, 500));
  const level = aqiLevel(clamped);
  const lo = AQI_BOUNDS[level - 1];
  const hi = AQI_BOUNDS[level];
  const within = (clamped - lo) / (hi - lo);
  return ((level - 1) + within) * (GAUGE.sweep / 6);
}

function polar(angleFromStart: number, r: number): [number, number] {
  const a = ((GAUGE.start - angleFromStart) * Math.PI) / 180;
  return [GAUGE.cx + r * Math.cos(a), GAUGE.cy - r * Math.sin(a)];
}

/** Path SVG của cung từ góc a0 → a1 (đơn vị: độ quét tính từ đầu thang). */
export function gaugeArcPath(a0: number, a1: number): string {
  const [x0, y0] = polar(a0, GAUGE.r);
  const [x1, y1] = polar(a1, GAUGE.r);
  const large = a1 - a0 > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${GAUGE.r} ${GAUGE.r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** Tọa độ kim (chấm tròn) tại giá trị AQI. */
export function gaugeNeedle(aqi: number): { x: number; y: number } {
  const [x, y] = polar(gaugeAngle(aqi), GAUGE.r);
  return { x, y };
}

/** 6 path segment nền của gauge (tĩnh). */
export function gaugeSegments(): { path: string; color: string }[] {
  const segAngle = GAUGE.sweep / 6;
  return [1, 2, 3, 4, 5, 6].map((level) => {
    const i = level - 1;
    const a0 = i * segAngle + (i > 0 ? GAUGE.segGap / 2 : 0);
    const a1 = (i + 1) * segAngle - (i < 5 ? GAUGE.segGap / 2 : 0);
    return { path: gaugeArcPath(a0, a1), color: AQI_COLORS[level as AqiLevel] };
  });
}
