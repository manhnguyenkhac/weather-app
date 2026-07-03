import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RecentLocationList } from './recent-location-list';
import { GeocodeResult, WeatherApi } from '../../core/weather-api';
import { RecentLocations } from '../../core/recent-locations';

describe('RecentLocationList', () => {
  const hanoi: GeocodeResult = { name: 'Hanoi', country: 'Vietnam', latitude: 21.0245, longitude: 105.8412 };
  const hue: GeocodeResult = { name: 'Huế', country: 'Vietnam', latitude: 16.4619, longitude: 107.59546 };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [RecentLocationList],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('không render gì khi chưa có lịch sử', async () => {
    const fixture = TestBed.createComponent(RecentLocationList);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('.recent')).toBeNull();
  });

  it('render card cho từng địa điểm và click chọn được city', () => {
    const recent = TestBed.inject(RecentLocations);
    recent.add(hanoi);
    recent.add(hue);

    const fixture = TestBed.createComponent(RecentLocationList);
    // Card có httpResource pending (fetch nhiệt độ) nên whenStable() sẽ treo — dùng CD đồng bộ
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Địa điểm gần đây');
    expect(el.textContent).toContain('Hanoi');
    expect(el.textContent).toContain('Huế');

    const hanoiCard = Array.from(el.querySelectorAll('button.card')).find((b) => b.textContent!.includes('Hanoi'))!;
    (hanoiCard as HTMLButtonElement).click();

    expect(TestBed.inject(WeatherApi).selectedCity()).toEqual(hanoi);
  });
});
