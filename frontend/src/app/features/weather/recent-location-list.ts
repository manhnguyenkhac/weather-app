import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GeocodeResult, WeatherApi } from '../../core/weather-api';
import { RecentLocations } from '../../core/recent-locations';
import { RecentLocationCard } from './recent-location-card';

@Component({
  selector: 'app-recent-location-list',
  templateUrl: './recent-location-list.html',
  styleUrl: './recent-location-list.css',
  imports: [RecentLocationCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecentLocationList {
  protected readonly recent = inject(RecentLocations);
  private readonly api = inject(WeatherApi);

  choose(city: GeocodeResult): void {
    this.api.selectCity(city);
  }
}
