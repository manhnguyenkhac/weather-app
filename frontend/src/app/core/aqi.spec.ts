import {
  AQI_COLORS,
  aqiAdvice,
  aqiHeadline,
  aqiLevel,
  aqiLevelName,
  gaugeAngle,
  gaugeNeedle,
  gaugeSegments,
  whoPercent,
  whoTimes,
} from './aqi';

describe('aqiLevel', () => {
  it('map đúng biên từng mức', () => {
    expect(aqiLevel(0)).toBe(1);
    expect(aqiLevel(50)).toBe(1);
    expect(aqiLevel(51)).toBe(2);
    expect(aqiLevel(100)).toBe(2);
    expect(aqiLevel(101)).toBe(3);
    expect(aqiLevel(150)).toBe(3);
    expect(aqiLevel(151)).toBe(4);
    expect(aqiLevel(200)).toBe(4);
    expect(aqiLevel(201)).toBe(5);
    expect(aqiLevel(300)).toBe(5);
    expect(aqiLevel(301)).toBe(6);
    expect(aqiLevel(500)).toBe(6);
  });
});

describe('nhãn và lời khuyên', () => {
  it('đủ 6 mức, mức 3 đúng nội dung thiết kế', () => {
    expect(aqiLevelName(3)).toBe('Kém (nhóm nhạy cảm)');
    expect(aqiHeadline(3)).toContain('Nhóm nhạy cảm');
    expect(aqiAdvice(3)).toHaveLength(2);
    for (const level of [1, 2, 3, 4, 5, 6] as const) {
      expect(aqiLevelName(level)).toBeTruthy();
      expect(aqiHeadline(level)).toBeTruthy();
      expect(aqiAdvice(level)).toHaveLength(2);
      expect(AQI_COLORS[level]).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});

describe('whoPercent / whoTimes', () => {
  it('tính % so ngưỡng WHO, kẹp trần 100', () => {
    expect(whoPercent('pm25', 15)).toBe(100);
    expect(whoPercent('pm25', 7.5)).toBe(50);
    expect(whoPercent('pm25', 48.2)).toBe(100); // vượt ngưỡng → kẹp 100
    expect(whoPercent('pm25', 0)).toBe(0);
    expect(whoPercent('khong-ton-tai', 50)).toBe(0);
  });

  it('whoTimes trả bội số 1 chữ số lẻ', () => {
    expect(whoTimes('pm25', 48.2)).toBe(3.2); // 48.2 / 15 = 3.21…
    expect(whoTimes('pm10', 45)).toBe(1);
  });
});

describe('hình học gauge', () => {
  it('gaugeAngle: 0 → 0°, giữa mức 1 → 17.5°, 500+ kẹp trần 210°', () => {
    expect(gaugeAngle(0)).toBe(0);
    expect(gaugeAngle(25)).toBeCloseTo(17.5, 5); // nửa segment đầu (35°/2)
    expect(gaugeAngle(500)).toBe(210);
    expect(gaugeAngle(9999)).toBe(210);
  });

  it('AQI 132 nằm trong segment 3 (64% của mức 101-150)', () => {
    const angle = gaugeAngle(132);
    // segment 3 chạy từ 70° đến 105°
    expect(angle).toBeGreaterThan(70);
    expect(angle).toBeLessThan(105);
  });

  it('gaugeSegments trả 6 path màu đúng thứ tự mức', () => {
    const segs = gaugeSegments();
    expect(segs).toHaveLength(6);
    expect(segs[0].color).toBe(AQI_COLORS[1]);
    expect(segs[5].color).toBe(AQI_COLORS[6]);
    for (const s of segs) expect(s.path).toMatch(/^M .+ A /);
  });

  it('kim tại 0 nằm mép trái, tại 500 nằm mép phải (đối xứng qua tâm)', () => {
    const left = gaugeNeedle(0);
    const right = gaugeNeedle(500);
    expect(left.x).toBeLessThan(107.5);
    expect(right.x).toBeGreaterThan(107.5);
    expect(left.y).toBeCloseTo(right.y, 1);
  });
});
