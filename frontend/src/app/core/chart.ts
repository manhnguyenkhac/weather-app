// Hình học biểu đồ SVG — hàm thuần, test không cần Angular.

export interface ChartFrame {
  width: number;
  height: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
}

export interface LinePoint {
  x: number;
  y: number;
  value: number;
  index: number;
}

/** Scale tuyến tính value ∈ [min, max] → tọa độ pixel [out0, out1]. */
export function scaleLinear(value: number, min: number, max: number, out0: number, out1: number): number {
  if (max === min) return (out0 + out1) / 2; // dải phẳng — vẽ giữa khung
  return out0 + ((value - min) / (max - min)) * (out1 - out0);
}

/** Miền y "đẹp": nới min/max thô ±5% rồi làm tròn 1 độ cho gridline không lẻ. */
export function niceDomain(values: number[]): { min: number; max: number } {
  if (values.length === 0) return { min: 0, max: 1 }; // Math.min(...[]) = Infinity → path NaN
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const pad = Math.max((rawMax - rawMin) * 0.1, 0.5);
  return { min: Math.floor(rawMin - pad), max: Math.ceil(rawMax + pad) };
}

/** Tọa độ các điểm của đường nhiệt trong khung. */
export function linePoints(values: number[], frame: ChartFrame, domain: { min: number; max: number }): LinePoint[] {
  const x0 = frame.padLeft;
  const x1 = frame.width - frame.padRight;
  const yTop = frame.padTop;
  const yBottom = frame.height - frame.padBottom;
  const step = values.length > 1 ? (x1 - x0) / (values.length - 1) : 0;

  return values.map((value, index) => ({
    index,
    value,
    x: Math.round((x0 + index * step) * 10) / 10,
    // giá trị lớn nằm TRÊN (y nhỏ)
    y: Math.round(scaleLinear(value, domain.min, domain.max, yBottom, yTop) * 10) / 10,
  }));
}

/** Path SVG của polyline nối các điểm. */
export function linePath(points: LinePoint[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

/** Path vùng tô dưới đường (đóng xuống đáy khung). */
export function areaPath(points: LinePoint[], frame: ChartFrame): string {
  if (points.length === 0) return '';
  const bottom = frame.height - frame.padBottom;
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`;
}
