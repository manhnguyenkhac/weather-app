// RainViewer (miễn phí, không key) — helpers thuần, test không cần Angular.
// Metadata frames: https://api.rainviewer.com/public/weather-maps.json

export const RAINVIEWER_FRAMES_URL = 'https://api.rainviewer.com/public/weather-maps.json';

/** Shape phần cần dùng của weather-maps.json. */
export interface RainViewerMaps {
  host: string;
  radar: {
    past: RainViewerFrame[];
    nowcast: RainViewerFrame[];
  };
}

export interface RainViewerFrame {
  time: number; // unix seconds
  path: string; // vd "/v2/radar/1720072800"
}

export interface RadarFrame {
  time: number;
  path: string;
  nowcast: boolean;
}

/** Gộp past + nowcast thành một dải frame theo thứ tự thời gian, đánh dấu nowcast. */
export function mergeFrames(maps: RainViewerMaps): RadarFrame[] {
  const past = (maps.radar?.past ?? []).map((f) => ({ ...f, nowcast: false }));
  const nowcast = (maps.radar?.nowcast ?? []).map((f) => ({ ...f, nowcast: true }));
  return [...past, ...nowcast];
}

/**
 * Template URL tile Leaflet cho một frame.
 * 256 = kích thước tile, 2 = bảng màu universal blue, 1_1 = smooth + hiển thị tuyết.
 */
export function frameTileTemplate(host: string, framePath: string): string {
  return `${host}${framePath}/256/{z}/{x}/{y}/2/1_1.png`;
}

/** Unix seconds → "HH:mm" giờ máy người dùng. */
export function frameTimeLabel(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}
