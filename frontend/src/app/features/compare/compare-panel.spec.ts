import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComparePanel } from './compare-panel';
import { WeatherApi } from '../../core/weather-api';
import { CompareList } from '../../core/compare';

describe('ComparePanel', () => {
  const hanoi = { name: 'Hanoi', country: 'Vietnam', latitude: 21.0245, longitude: 105.8412 };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ComparePanel],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  function createFixture() {
    const fixture = TestBed.createComponent(ComparePanel);
    fixture.detectChanges();
    return fixture;
  }

  it('mặc định thu gọn, tóm tắt hiện sức chứa', () => {
    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('.head')!.getAttribute('aria-expanded')).toBe('false');
    expect(el.textContent).toContain('So sánh thành phố');
    expect(el.querySelector('.grid')).toBeNull();
  });

  it('mở panel: bấm "+ Thêm city đang xem" thì card xuất hiện, nút disabled sau đó', () => {
    TestBed.inject(WeatherApi).selectCity(hanoi);
    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.head') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el.querySelector('.add-current') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(TestBed.inject(CompareList).cities()).toHaveLength(1);
    expect(el.querySelectorAll('app-compare-card').length).toBe(1);
    expect((el.querySelector('.add-current') as HTMLButtonElement).disabled).toBe(true);
    expect(el.textContent).toContain('Hanoi');
  });

  it('bỏ city bằng nút ✕ trên card', () => {
    const compare = TestBed.inject(CompareList);
    compare.add(hanoi);
    const fixture = createFixture();
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.head') as HTMLButtonElement).click();
    fixture.detectChanges();
    (el.querySelector('app-compare-card .remove') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(compare.cities()).toHaveLength(0);
  });
});
