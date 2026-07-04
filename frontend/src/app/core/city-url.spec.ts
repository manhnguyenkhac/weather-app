import { Location } from '@angular/common';
import { SpyLocation } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { CityUrl, cityToPath, pathToCity } from './city-url';
import { WeatherApi } from './weather-api';

describe('cityToPath / pathToCity', () => {
  it('roundtrip tên có dấu + country', () => {
    const city = { name: 'Hà Nội', country: 'Vietnam', latitude: 21.0245, longitude: 105.8412 };
    const path = cityToPath(city);

    expect(path).toBe('/city/H%C3%A0-N%E1%BB%99i,Vietnam@21.0245,105.8412');
    expect(pathToCity(path)).toEqual(city);
  });

  it('roundtrip không country + tọa độ âm', () => {
    const city = { name: 'Ushuaia', country: '', latitude: -54.8, longitude: -68.3 };
    expect(pathToCity(cityToPath(city))).toEqual(city);
  });

  it('path rác hoặc tọa độ ngoài khoảng → null', () => {
    expect(pathToCity('/')).toBeNull();
    expect(pathToCity('/city/abc')).toBeNull();
    expect(pathToCity('/city/X@91,105')).toBeNull();
    expect(pathToCity('/city/X@21,181')).toBeNull();
    expect(pathToCity('/city/@21,105')).toBeNull();
  });

  it('chuỗi % hỏng → null, không ném URIError (app không được chết vì URL rác)', () => {
    expect(pathToCity('/city/%E0%A@21,105')).toBeNull();
  });
});

describe('CityUrl service', () => {
  let spyLocation: SpyLocation;

  function setup(initialPath: string): { api: WeatherApi; svc: CityUrl } {
    localStorage.clear();
    TestBed.resetTestingModule();
    spyLocation = new SpyLocation();
    spyLocation.setInitialPath(initialPath);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Location, useValue: spyLocation },
      ],
    });
    const api = TestBed.inject(WeatherApi);
    const svc = TestBed.inject(CityUrl);
    return { api, svc };
  }

  it('deep link /city/... lúc boot → chọn đúng thành phố', () => {
    const { api } = setup('/city/Tokyo,Japan@35.68,139.69');

    expect(api.selectedCity()).toEqual({ name: 'Tokyo', country: 'Japan', latitude: 35.68, longitude: 139.69 });
  });

  it('chọn city → URL đổi theo + document.title theo tên', () => {
    const { api } = setup('/');
    api.selectCity({ name: 'Đà Nẵng', country: 'Vietnam', latitude: 16.07, longitude: 108.22 });
    TestBed.tick(); // chạy effect đẩy URL

    expect(spyLocation.path()).toBe(cityToPath(api.selectedCity()!));
    expect(document.title).toContain('Đà Nẵng');
  });

  it('back về / → bỏ chọn city (về trang chủ)', () => {
    const { api } = setup('/');
    api.selectCity({ name: 'Hue', country: 'Vietnam', latitude: 16.46, longitude: 107.59 });
    TestBed.tick();

    spyLocation.simulateUrlPop('/');

    expect(api.selectedCity()).toBeUndefined();
  });

  it('popstate sang /city/ khác → chọn city đó, không lặp vô hạn', () => {
    const { api } = setup('/');
    spyLocation.simulateUrlPop('/city/Paris,France@48.85,2.35');

    expect(api.selectedCity()?.name).toBe('Paris');
    TestBed.tick(); // effect chạy — URL đã đúng nên không push thêm
  });
});
