import { RainViewerMaps, frameTileTemplate, frameTimeLabel, mergeFrames } from './rainviewer';

describe('mergeFrames', () => {
  it('gộp past + nowcast theo thứ tự, đánh dấu nowcast', () => {
    const maps: RainViewerMaps = {
      host: 'https://tilecache.rainviewer.com',
      radar: {
        past: [
          { time: 1000, path: '/v2/radar/1000' },
          { time: 1600, path: '/v2/radar/1600' },
        ],
        nowcast: [{ time: 2200, path: '/v2/radar/nowcast_x' }],
      },
    };

    const frames = mergeFrames(maps);

    expect(frames).toHaveLength(3);
    expect(frames[0]).toEqual({ time: 1000, path: '/v2/radar/1000', nowcast: false });
    expect(frames[2].nowcast).toBe(true);
  });

  it('radar thiếu mảng thì trả rỗng, không crash', () => {
    expect(mergeFrames({ host: 'h', radar: {} as never })).toEqual([]);
  });
});

describe('frameTileTemplate', () => {
  it('ghép host + path + tham số tile chuẩn Leaflet', () => {
    expect(frameTileTemplate('https://tilecache.rainviewer.com', '/v2/radar/1720072800'))
      .toBe('https://tilecache.rainviewer.com/v2/radar/1720072800/256/{z}/{x}/{y}/2/1_1.png');
  });
});

describe('frameTimeLabel', () => {
  it('format HH:mm theo giờ máy (so với chính Date để không phụ thuộc timezone)', () => {
    const unix = 1720072800;
    const d = new Date(unix * 1000);
    const expected = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    expect(frameTimeLabel(unix)).toBe(expected);
  });
});
