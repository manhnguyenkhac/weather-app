import { TestBed } from '@angular/core/testing';
import { ThemePreference } from './theme';

function mockMatchMedia(dark: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: dark && query.includes('dark'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });
}

function createTheme(): ThemePreference {
  return TestBed.inject(ThemePreference);
}

describe('ThemePreference', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset['theme'];
    mockMatchMedia(false);
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
  });

  it('mặc định auto — hệ sáng thì resolved light, gắn data-theme=light', () => {
    const theme = createTheme();
    TestBed.tick(); // chạy effect gắn data-theme

    expect(theme.theme()).toBe('auto');
    expect(theme.resolved()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });

  it('auto + hệ điều hành dark → resolved dark', () => {
    mockMatchMedia(true);
    const theme = createTheme();
    TestBed.tick();

    expect(theme.resolved()).toBe('dark');
    expect(document.documentElement.dataset['theme']).toBe('dark');
  });

  it('setTheme dark: gắn data-theme và lưu localStorage', () => {
    const theme = createTheme();
    theme.setTheme('dark');
    TestBed.tick();

    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(localStorage.getItem('weather-app.theme')).toBe('dark');
  });

  it('đọc lại lựa chọn đã lưu; giá trị rác → auto', () => {
    localStorage.setItem('weather-app.theme', 'dark');
    expect(createTheme().theme()).toBe('dark');

    localStorage.setItem('weather-app.theme', 'neon');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    expect(createTheme().theme()).toBe('auto');
  });

  it('chọn light tường minh thì kệ hệ điều hành dark', () => {
    mockMatchMedia(true);
    const theme = createTheme();
    theme.setTheme('light');
    TestBed.tick();

    expect(theme.resolved()).toBe('light');
    expect(document.documentElement.dataset['theme']).toBe('light');
  });
});
