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

  // Trạng thái OS-dark là SIGNAL: computed nào đọc resolved() sẽ tự re-evaluate khi OS đổi (#74)
  private readonly osDark = signal(this.media?.matches ?? false);

  constructor() {
    effect(() => this.apply());

    // Hệ điều hành đổi sáng/tối lúc đang mở app — effect apply() tự chạy lại qua signal osDark
    this.media?.addEventListener('change', (event) => this.osDark.set(event.matches));
  }

  setTheme(theme: Theme): void {
    this.theme.set(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage bị chặn — không nhớ được nhưng app vẫn chạy
    }
  }

  /** 'auto' quy về light/dark thật theo hệ điều hành — reactive (đọc signal osDark). */
  resolved(): 'light' | 'dark' {
    const theme = this.theme();
    if (theme !== 'auto') return theme;
    return this.osDark() ? 'dark' : 'light';
  }

  private apply(): void {
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
