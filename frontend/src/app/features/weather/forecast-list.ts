import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DailyForecast, weatherCodeLabel } from '../../core/weather-api';

@Component({
  selector: 'app-forecast-list',
  templateUrl: './forecast-list.html',
  styleUrl: './forecast-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForecastList {
  readonly days = input.required<DailyForecast[]>();

  protected readonly label = weatherCodeLabel;
}
