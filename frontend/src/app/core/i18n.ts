import { Injectable, signal } from '@angular/core';

export type Lang = 'vi' | 'en';

const STORAGE_KEY = 'weather-app.lang';

/** Từ điển phẳng — key theo khu vực UI. */
const DICT: Record<string, Record<Lang, string>> = {
  // Header / trang chủ
  'search.placeholder': { vi: 'Tìm thành phố (vd: Hanoi, Da Nang…)', en: 'Search city (e.g. Hanoi, Da Nang…)' },
  'search.button': { vi: 'Tìm', en: 'Search' },
  'search.searching': { vi: 'Đang tìm…', en: 'Searching…' },
  'search.error': { vi: 'Không tìm được thành phố — thử lại sau.', en: 'City search failed — try again later.' },
  'search.empty': { vi: 'Không có kết quả nào khớp.', en: 'No matching results.' },
  'home.empty': { vi: 'Tìm một thành phố để xem thời tiết hiện tại, dự báo theo giờ và 7 ngày tới.', en: 'Search a city to see current weather, hourly and 7-day forecast.' },
  'home.myLocation': { vi: '📍 Thời tiết chỗ tôi', en: '📍 Weather at my location' },
  'home.locating': { vi: '📡 Đang định vị…', en: '📡 Locating…' },
  'geo.unsupported': { vi: 'Trình duyệt này không hỗ trợ định vị.', en: 'This browser does not support geolocation.' },
  'geo.denied': { vi: 'Bạn đã từ chối quyền định vị — cấp lại trong cài đặt trình duyệt rồi thử lại.', en: 'Location permission denied — re-enable it in browser settings and retry.' },
  'geo.unavailable': { vi: 'Không xác định được vị trí — thử lại hoặc tìm theo tên thành phố.', en: 'Could not determine your location — retry or search by city name.' },
  'geo.timeout': { vi: 'Định vị quá lâu không phản hồi — thử lại nhé.', en: 'Location request timed out — please retry.' },
  'geo.generic': { vi: 'Không định vị được — thử tìm theo tên thành phố.', en: 'Location failed — try searching by city name.' },

  // Forecast chung
  'forecast.loading': { vi: 'Đang tải dự báo…', en: 'Loading forecast…' },
  'forecast.error': { vi: 'Không lấy được dữ liệu thời tiết — thử lại sau.', en: 'Could not load weather data — try again later.' },
  'hero.now': { vi: 'Hiện tại', en: 'Now' },
  'hero.wind': { vi: 'Gió', en: 'Wind' },
  'hero.humidity': { vi: 'Độ ẩm', en: 'Humidity' },
  'hourly.title': { vi: 'Theo giờ', en: 'Hourly' },
  'chart.title': { vi: 'Biểu đồ nhiệt độ', en: 'Temperature chart' },
  'chart.next24h': { vi: '24 giờ tới', en: 'Next 24 hours' },
  'chart.minmax': { vi: 'Min–max theo ngày', en: 'Daily min–max' },
  'daily.title': { vi: 'Dự báo', en: 'Forecast' },
  'daily.days': { vi: 'ngày', en: 'days' },
  'daily.hint': { vi: '— bấm vào ngày để xem chi tiết', en: '— tap a day for details' },
  'daily.sunrise': { vi: 'Mọc', en: 'Sunrise' },
  'daily.sunset': { vi: 'Lặn', en: 'Sunset' },
  'daily.rain': { vi: 'Mưa', en: 'Rain' },

  // AQI
  'aqi.title': { vi: 'Chất lượng không khí', en: 'Air quality' },
  'aqi.loading': { vi: 'Đang tải chỉ số không khí…', en: 'Loading air quality…' },
  'aqi.error': { vi: 'Không lấy được chỉ số không khí — thử lại sau.', en: 'Could not load air quality — try again later.' },
  'aqi.noData': { vi: 'Không có dữ liệu', en: 'No data' },
  'aqi.dominant': { vi: 'Chất ô nhiễm chính:', en: 'Main pollutant:' },
  'aqi.whoTimes': { vi: 'gấp {x}× ngưỡng WHO', en: '{x}× WHO guideline' },
  'aqi.hourly': { vi: 'AQI theo giờ — 24 giờ tới', en: 'Hourly AQI — next 24 hours' },
  'aqi.scale': { vi: 'Thang mức US AQI', en: 'US AQI scale' },
  'aqi.main': { vi: 'chính', en: 'main' },

  // Bản đồ
  'map.title': { vi: 'Bản đồ radar mưa', en: 'Rain radar map' },
  'map.tagline': { vi: 'Mưa thật theo radar + dự báo 30 phút', en: 'Live radar rain + 30-min nowcast' },
  'map.error': { vi: 'Không tải được dữ liệu radar — thử lại sau.', en: 'Could not load radar data — try again later.' },
  'map.nowcast': { vi: 'dự báo', en: 'nowcast' },
  'map.tip': { vi: '💡 Bấm vào bất kỳ đâu trên bản đồ để xem thời tiết + AQI tại điểm đó.', en: '💡 Click anywhere on the map to see weather + AQI at that point.' },
  'map.point': { vi: 'Tọa độ', en: 'Point' },
  'map.play': { vi: 'Chạy tua thời gian', en: 'Play timeline' },
  'map.pause': { vi: 'Dừng', en: 'Pause' },
  'map.slider': { vi: 'Chọn thời điểm radar', en: 'Pick radar time' },

  // So sánh
  'compare.title': { vi: 'So sánh thành phố', en: 'Compare cities' },
  'compare.capacity': { vi: 'thành phố', en: 'cities' },
  'compare.tagline': { vi: 'Đặt tối đa {n} nơi cạnh nhau', en: 'Put up to {n} places side by side' },
  'compare.addCurrent': { vi: '+ Thêm', en: '+ Add' },
  'compare.hint': { vi: 'Chọn thành phố từ nút phía trên (hoặc tìm rồi bấm "+ Thêm") để bắt đầu so sánh.', en: 'Pick a city from the buttons above (or search then "+ Add") to start comparing.' },
  'compare.highLow': { vi: 'Cao / thấp', en: 'High / low' },
  'compare.rainToday': { vi: 'Mưa hôm nay', en: 'Rain today' },
  'compare.loadError': { vi: 'Không tải được dữ liệu', en: 'Could not load data' },
  'compare.remove': { vi: 'Bỏ {name} khỏi so sánh', en: 'Remove {name} from comparison' },
  'common.loading': { vi: 'Đang tải…', en: 'Loading…' },

  // Recent + sidebar
  'recent.title': { vi: 'Địa điểm gần đây', en: 'Recent locations' },
  'sidebar.title': { vi: '⚙️ Cài đặt', en: '⚙️ Settings' },
  'sidebar.unit': { vi: 'Đơn vị nhiệt độ', en: 'Temperature unit' },
  'sidebar.language': { vi: 'Ngôn ngữ', en: 'Language' },
  'sidebar.weatherOf': { vi: 'thời tiết', en: 'weather' },
  'sidebar.current': { vi: '☀️ Hiện tại', en: '☀️ Current' },
  'sidebar.hourly': { vi: '🕒 Theo giờ', en: '🕒 Hourly' },
  'sidebar.daily': { vi: '📅 7 ngày', en: '📅 7 days' },
  'sidebar.clear': { vi: 'Xóa lịch sử', en: 'Clear history' },
  'sidebar.close': { vi: 'Đóng menu', en: 'Close menu' },
  'sidebar.open': { vi: 'Mở menu', en: 'Open menu' },
};

/** Dịch vụ ngôn ngữ — t(key) đọc signal lang nên template tự render lại khi đổi. */
@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = signal<Lang>(readInitial());

  setLang(lang: Lang): void {
    this.lang.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // localStorage bị chặn — không nhớ được nhưng app vẫn chạy
    }
  }

  toggle(): void {
    this.setLang(this.lang() === 'vi' ? 'en' : 'vi');
  }

  /** Tra từ điển; thiếu key thì trả chính key (dễ phát hiện khi dev). Hỗ trợ thay {x}/{n}. */
  t(key: string, params?: Record<string, string | number>): string {
    let text = DICT[key]?.[this.lang()] ?? key;
    for (const [name, value] of Object.entries(params ?? {})) {
      text = text.replace(`{${name}}`, String(value));
    }
    return text;
  }
}

function readInitial(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'en' ? 'en' : 'vi';
  } catch {
    return 'vi';
  }
}
