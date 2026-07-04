import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { RainMap } from './rain-map';

describe('RainMap', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [RainMap],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
  });

  it('mặc định thu gọn: không khởi tạo bản đồ, không fetch frames', () => {
    const fixture = TestBed.createComponent(RainMap);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Bản đồ radar mưa');
    expect(el.querySelector('.map-host')).toBeNull();
    expect(el.querySelector('.head')!.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.componentInstance.expanded()).toBe(false);
  });

  it('mở panel thì render khung bản đồ và resource frames chuyển khỏi idle', () => {
    const fixture = TestBed.createComponent(RainMap);
    fixture.detectChanges();

    ((fixture.nativeElement as HTMLElement).querySelector('.head') as HTMLButtonElement).click();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.head')!.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('.map-host')).toBeTruthy();
  });

  it('đóng panel khi đang play thì dừng play', () => {
    const fixture = TestBed.createComponent(RainMap);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    component.toggle(); // mở
    component.playing.set(true);
    component.toggle(); // đóng

    expect(component.playing()).toBe(false);
  });
});
