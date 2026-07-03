import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Sidebar } from './sidebar';
import { GeocodeResult, WeatherApi } from '../../core/weather-api';
import { RecentLocations } from '../../core/recent-locations';
import { UnitPreference } from '../../core/unit-preference';

describe('Sidebar', () => {
  const hanoi: GeocodeResult = { name: 'Hanoi', country: 'Vietnam', latitude: 21.0245, longitude: 105.8412 };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Sidebar],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  async function createFixture(open: boolean) {
    const fixture = TestBed.createComponent(Sidebar);
    fixture.componentRef.setInput('open', open);
    await fixture.whenStable();
    return fixture;
  }

  it('không render gì khi đóng', async () => {
    const fixture = await createFixture(false);

    expect((fixture.nativeElement as HTMLElement).querySelector('.panel')).toBeNull();
  });

  it('mở thì hiện Cài đặt và segmented đơn vị hoạt động', async () => {
    const fixture = await createFixture(true);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Cài đặt');

    const fButton = Array.from(el.querySelectorAll('.segmented button')).find((b) => b.textContent!.includes('°F'))!;
    (fButton as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(TestBed.inject(UnitPreference).unit()).toBe('F');
  });

  it('chọn địa điểm gần đây thì select city và emit closed', async () => {
    TestBed.inject(RecentLocations).add(hanoi);
    const fixture = await createFixture(true);
    let closedCount = 0;
    fixture.componentInstance.closed.subscribe(() => closedCount++);

    const el = fixture.nativeElement as HTMLElement;
    const cityButton = Array.from(el.querySelectorAll('.links button')).find((b) => b.textContent!.includes('Hanoi'))!;
    (cityButton as HTMLButtonElement).click();
    // Không whenStable() sau click: selectCity kích forecast httpResource pending sẽ làm stability treo

    expect(TestBed.inject(WeatherApi).selectedCity()).toEqual(hanoi);
    expect(closedCount).toBe(1);
  });

  it('xóa lịch sử làm trống danh sách', async () => {
    const recent = TestBed.inject(RecentLocations);
    recent.add(hanoi);
    const fixture = await createFixture(true);

    ((fixture.nativeElement as HTMLElement).querySelector('.clear') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(recent.locations()).toEqual([]);
  });
});
