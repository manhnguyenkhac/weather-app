import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { GeocodeResult, WeatherApi, formatCityLabel } from '../../core/weather-api';
import { RecentLocations } from '../../core/recent-locations';
import { TemperatureUnit, UnitPreference } from '../../core/unit-preference';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Sidebar {
  readonly open = input.required<boolean>();
  readonly closed = output<void>();

  protected readonly pref = inject(UnitPreference);
  protected readonly api = inject(WeatherApi);
  protected readonly recent = inject(RecentLocations);

  protected readonly label = formatCityLabel;

  setUnit(unit: TemperatureUnit): void {
    this.pref.setUnit(unit);
  }

  goTo(sectionId: string): void {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    this.closed.emit();
  }

  choose(city: GeocodeResult): void {
    this.api.selectCity(city);
    this.closed.emit();
  }
}
