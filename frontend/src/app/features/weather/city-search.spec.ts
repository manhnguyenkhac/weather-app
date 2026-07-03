import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CitySearch } from './city-search';
import { WeatherApi } from '../../core/weather-api';

describe('CitySearch', () => {
  async function createFixture() {
    await TestBed.configureTestingModule({
      imports: [CitySearch],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    return TestBed.createComponent(CitySearch);
  }

  it('form invalid khi city rỗng hoặc quá ngắn', async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;
    await fixture.whenStable();

    expect(component.searchForm().invalid()).toBe(true);

    component.model.set({ city: 'H' });
    await fixture.whenStable();
    expect(component.searchForm().invalid()).toBe(true);

    component.model.set({ city: 'Hanoi' });
    await fixture.whenStable();
    expect(component.searchForm().valid()).toBe(true);
  });

  it('search() chỉ đẩy query sang WeatherApi khi form valid', async () => {
    const fixture = await createFixture();
    const component = fixture.componentInstance;
    const api = TestBed.inject(WeatherApi);
    await fixture.whenStable();

    component.model.set({ city: 'H' });
    await fixture.whenStable();
    component.search();
    expect(api.submittedQuery()).toBeUndefined();

    component.model.set({ city: 'Hanoi' });
    await fixture.whenStable();
    component.search();
    expect(api.submittedQuery()).toBe('Hanoi');
  });
});
