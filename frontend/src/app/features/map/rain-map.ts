import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { httpResource } from '@angular/common/http';
import * as L from 'leaflet';
import { WeatherApi } from '../../core/weather-api';
import { I18n } from '../../core/i18n';
import {
  RAINVIEWER_FRAMES_URL,
  RadarFrame,
  RainViewerMaps,
  frameTileTemplate,
  frameTimeLabel,
  mergeFrames,
} from '../../core/rainviewer';

const HANOI: L.LatLngTuple = [21.0278, 105.8342];

@Component({
  selector: 'app-rain-map',
  templateUrl: './rain-map.html',
  styleUrl: './rain-map.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RainMap {
  protected readonly api = inject(WeatherApi);
  protected readonly i18n = inject(I18n);
  private readonly destroyRef = inject(DestroyRef);

  // Thu gọn mặc định — Leaflet chỉ khởi tạo khi mở lần đầu (tiết kiệm tile + tránh lỗi size khi ẩn)
  readonly expanded = signal(false);
  readonly playing = signal(false);
  readonly frameIndex = signal(0);

  private readonly mapHost = viewChild<ElementRef<HTMLDivElement>>('mapHost');

  // Metadata frames radar — chỉ fetch khi panel được mở
  protected readonly maps = httpResource<RainViewerMaps>(() =>
    this.expanded() ? RAINVIEWER_FRAMES_URL : undefined);

  protected readonly frames = computed<RadarFrame[]>(() =>
    this.maps.hasValue() ? mergeFrames(this.maps.value()) : []);

  protected readonly currentFrame = computed(() => {
    const frames = this.frames();
    if (frames.length === 0) return null;
    const index = Math.min(this.frameIndex(), frames.length - 1);
    return { ...frames[index], label: frameTimeLabel(frames[index].time) };
  });

  private map: L.Map | null = null;
  private radarLayer: L.TileLayer | null = null;
  private marker: L.Marker | null = null;
  private playTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Khởi tạo map khi panel mở và div đã render
    effect(() => {
      const host = this.mapHost();
      if (this.expanded() && host && !this.map) {
        this.initMap(host.nativeElement);
      }
    });

    // Frame đổi (slider/play) → thay URL lớp radar
    effect(() => {
      const frame = this.currentFrame();
      const maps = this.maps.hasValue() ? this.maps.value() : null;
      if (!this.map || !frame || !maps) return;
      const url = frameTileTemplate(maps.host, frame.path);
      if (!this.radarLayer) {
        this.radarLayer = L.tileLayer(url, { opacity: 0.7, maxZoom: 12 }).addTo(this.map);
      } else {
        this.radarLayer.setUrl(url);
      }
    });

    // City đổi → bay tới + cắm marker
    effect(() => {
      const city = this.api.selectedCity();
      if (!this.map || !city) return;
      const pos: L.LatLngTuple = [city.latitude, city.longitude];
      this.map.setView(pos, this.map.getZoom());
      this.setMarker(pos);
    });

    this.destroyRef.onDestroy(() => {
      this.stopPlaying();
      this.destroyMap();
    });
  }

  private initMap(host: HTMLDivElement): void {
    const city = this.api.selectedCity();
    const center: L.LatLngTuple = city ? [city.latitude, city.longitude] : HANOI;

    this.map = L.map(host, { center, zoom: 6, zoomControl: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, radar © <a href="https://www.rainviewer.com">RainViewer</a>',
      maxZoom: 12,
    }).addTo(this.map);

    if (city) {
      this.setMarker(center);
    }

    // Click bản đồ → xem thời tiết + AQI tại điểm đó (tái dùng cơ chế city ảo như "Vị trí của tôi")
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      const lat = Math.round(e.latlng.lat * 10000) / 10000;
      const lon = Math.round(e.latlng.lng * 10000) / 10000;
      this.api.selectCity({
        name: `${this.i18n.t('map.point')} ${lat.toFixed(2)}, ${lon.toFixed(2)}`,
        country: '',
        latitude: lat,
        longitude: lon,
      });
    });
  }

  private setMarker(pos: L.LatLngTuple): void {
    if (!this.map) return;
    if (this.marker) {
      this.marker.setLatLng(pos);
      return;
    }
    // divIcon emoji — né vụ đường dẫn icon mặc định của Leaflet vỡ dưới bundler
    const icon = L.divIcon({ className: 'map-pin', html: '📍', iconSize: [24, 24], iconAnchor: [12, 22] });
    this.marker = L.marker(pos, { icon }).addTo(this.map);
  }

  toggle(): void {
    this.expanded.update((v) => !v);
    if (!this.expanded()) {
      this.stopPlaying();
      // @if gỡ div bản đồ khỏi DOM khi đóng — phải hủy map để lần mở sau init lại trên div mới,
      // nếu không this.map trỏ vào div đã chết → panel trắng
      this.destroyMap();
    }
  }

  private destroyMap(): void {
    this.map?.remove();
    this.map = null;
    this.radarLayer = null;
    this.marker = null;
  }

  togglePlay(): void {
    if (this.playing()) {
      this.stopPlaying();
      return;
    }
    if (this.frames().length === 0) return;
    this.playing.set(true);
    this.playTimer = setInterval(() => {
      this.frameIndex.update((i) => (i + 1) % this.frames().length);
    }, 500);
  }

  private stopPlaying(): void {
    this.playing.set(false);
    if (this.playTimer !== null) {
      clearInterval(this.playTimer);
      this.playTimer = null;
    }
  }

  onSlider(event: Event): void {
    this.stopPlaying();
    this.frameIndex.set(Number((event.target as HTMLInputElement).value));
  }
}
