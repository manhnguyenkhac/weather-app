import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { GeocodeResult, WeatherApi, formatCityLabel } from '../../core/weather-api';
import { CompareList, MAX_COMPARE } from '../../core/compare';
import { RecentLocations } from '../../core/recent-locations';
import { CompareCard } from './compare-card';

@Component({
  selector: 'app-compare-panel',
  templateUrl: './compare-panel.html',
  styleUrl: './compare-panel.css',
  imports: [CompareCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparePanel {
  protected readonly api = inject(WeatherApi);
  protected readonly compare = inject(CompareList);
  private readonly recent = inject(RecentLocations);

  readonly expanded = signal(false);
  protected readonly maxCompare = MAX_COMPARE;

  protected readonly label = formatCityLabel;

  protected readonly canAddCurrent = computed(() => {
    const city = this.api.selectedCity();
    return !!city && !this.compare.has(city) && this.compare.cities().length < MAX_COMPARE;
  });

  // Gợi ý từ lịch sử: chưa nằm trong danh sách so sánh
  protected readonly suggestions = computed(() =>
    this.recent.locations().filter((c) => !this.compare.has(c)).slice(0, 4));

  addCurrent(): void {
    const city = this.api.selectedCity();
    if (city) {
      this.compare.add(city);
    }
  }

  add(city: GeocodeResult): void {
    this.compare.add(city);
  }
}
