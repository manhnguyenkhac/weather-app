import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormField, form, minLength, required } from '@angular/forms/signals';
import { GeocodeResult, WeatherApi } from '../../core/weather-api';
import { I18n } from '../../core/i18n';

@Component({
  selector: 'app-city-search',
  templateUrl: './city-search.html',
  styleUrl: './city-search.css',
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CitySearch {
  protected readonly api = inject(WeatherApi);
  protected readonly i18n = inject(I18n);

  readonly model = signal({ city: '' });

  readonly searchForm = form(this.model, (p) => {
    required(p.city, { message: 'Nhập tên thành phố' });
    minLength(p.city, 2, { message: 'Tối thiểu 2 ký tự' });
  });

  search(): void {
    if (this.searchForm().valid()) {
      this.api.search(this.model().city);
    }
  }

  choose(city: GeocodeResult): void {
    this.api.selectCity(city);
  }
}
