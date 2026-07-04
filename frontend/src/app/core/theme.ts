import { Injectable, effect, signal } from '@angular/core';

export type Theme = 'light' | 'dark' | 'auto';

const STORAGE_KEY = 'weather-app.theme';

/**
 * Giao diện Sáng/Tối/Tự động — 'auto' theo hệ điều hành (prefers-color-scheme).
 * Effect gắn data-theme="light|dark" lên <html>; CSS token override theo :root[data-theme="dark"].
 */
@Injectable({ providedIn: 'root' })
export class ThemePreference {
  readonly theme = signal<Theme>(readInitial());

  private readonly media = window.matchMedia?.('(prefers-color-scheme: dark)') ?? null;

  constructor() {
    effect(() => this.apply(this.theme()));

    // Hệ điều hành đổi sáng/tối lúc đang mở app — chỉ ăn khi user chọn 'auto'
    this.media?.addEventListener('change', () => {
      if (this.theme() === 'auto') {
        this.apply('auto');
      }
    });
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage bị chặn — không nhớ được nhưng app vẫn chạy
    }
  }

  /** 'auto' quy về light/dark thật theo hệ điều hành tại thời điểm gọi. */
  resolved(): 'light' | 'dark' {
    const theme = this.theme();
    if (theme !== 'auto') return theme;
    return this.media?.matches ? 'dark' : 'light';
  }

  private apply(_theme: Theme): void {
    document.documentElement.dataset['theme'] = this.resolved();
  }
}

function readInitial(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'auto';
  } catch {
    return 'auto';
  }
}
