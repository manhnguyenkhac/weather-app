import { Injectable, signal } from '@angular/core';

export type TemperatureUnit = 'C' | 'F';

/** Đổi °C sang đơn vị chọn, làm tròn 1 số lẻ. Hàm thuần — test không cần Angular. */
export function convertTemp(celsius: number, unit: TemperatureUnit): number {
  if (unit === 'C') {
    return celsius;
  }
  return Math.round(((celsius * 9) / 5 + 32) * 10) / 10;
}

const STORAGE_KEY = 'weather-app.unit';

/** Lựa chọn đơn vị nhiệt độ — signal toàn cục, nhớ qua localStorage. */
@Injectable({ providedIn: 'root' })
export class UnitPreference {
  readonly unit = signal<TemperatureUnit>(readInitialUnit());

  toggle(): void {
    this.unit.update((u) => (u === 'C' ? 'F' : 'C'));
    try {
      localStorage.setItem(STORAGE_KEY, this.unit());
    } catch {
      // localStorage bị chặn (private mode...) — không nhớ được nhưng app vẫn chạy
    }
  }
}

function readInitialUnit(): TemperatureUnit {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'F' ? 'F' : 'C'; // giá trị lạ/thiếu → mặc định 'C'
  } catch {
    return 'C';
  }
}
