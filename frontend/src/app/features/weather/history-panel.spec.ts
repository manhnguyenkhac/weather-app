import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HistoryPanel } from './history-panel';
import { WeatherApi, historyUrl } from '../../core/weather-api';

const HANOI = { name: 'Hanoi', country: 'Vietnam', latitude: 21.0245, longitude: 105.8412 };

function historyBody(days: number) {
  const list = Array.from({ length: days }, (_, i) => ({
    date: `2026-06-${String(i + 1).padStart(2, '0')}`,
    tempMax: 32 + (i % 4),
    tempMin: 25 + (i % 3),
    precipitation: 2,
  }));
  return { days: list, normal: { tempMax: 32, tempMin: 25 } };
}

describe('HistoryPanel', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [HistoryPanel],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  function createFixture() {
    const fixture = TestBed.createComponent(HistoryPanel);
    fixture.detectChanges(); // resource có thể pending — không whenStable() (treo)
    return fixture;
  }

  it('thu gọn mặc định và KHÔNG fetch archive khi chưa mở', () => {
    TestBed.inject(WeatherApi).selectCity(HANOI);
    const http = TestBed.inject(HttpTestingController);

    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Xu hướng & lịch sử');
    expect(el.querySelector('.head')!.getAttribute('aria-expanded')).toBe('false');
    http.expectNone(historyUrl(HANOI.latitude, HANOI.longitude)); // lazy — chưa mở chưa gọi
  });

  it('mở panel → fetch, render chart 2 line + tổng mưa', async () => {
    TestBed.inject(WeatherApi).selectCity(HANOI);
    const http = TestBed.inject(HttpTestingController);
    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.head') as HTMLButtonElement).click();
    fixture.detectChanges();

    const req = await waitForRequest(http, historyUrl(HANOI.latitude, HANOI.longitude));
    req.flush(historyBody(30));
    await settle(); // KHÔNG whenStable() — treo khi httpResource còn pending
    fixture.detectChanges();

    expect(el.querySelectorAll('svg path.line').length).toBe(2);
    expect(el.textContent).toContain('Tổng mưa 30 ngày qua');
    expect(el.textContent).toContain('60 mm'); // 30 ngày × 2mm
  });

  it('lỗi backend → hiện message lỗi, không vỡ', async () => {
    TestBed.inject(WeatherApi).selectCity(HANOI);
    const http = TestBed.inject(HttpTestingController);
    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.head') as HTMLButtonElement).click();
    fixture.detectChanges();

    const req = await waitForRequest(http, historyUrl(HANOI.latitude, HANOI.longitude));
    req.flush('boom', { status: 502, statusText: 'Bad Gateway' });
    await settle(); // KHÔNG whenStable() — treo khi httpResource còn pending
    fixture.detectChanges();

    expect(el.textContent).toContain('Không tải được dữ liệu lịch sử');
  });
});

/** Chờ vài macrotask cho httpResource tiêu hóa response đã flush. */
function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 20));
}

/** httpResource gửi request async sau CD — poll tới khi HttpTestingController thấy nó. */
async function waitForRequest(http: HttpTestingController, url: string) {
  for (let i = 0; i < 50; i++) {
    const pending = http.match(url);
    if (pending.length > 0) return pending[0];
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Không thấy request tới ${url}`);
}
