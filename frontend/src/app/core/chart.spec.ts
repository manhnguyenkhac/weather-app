import { ChartFrame, areaPath, linePath, linePoints, niceDomain, scaleLinear } from './chart';

const frame: ChartFrame = { width: 100, height: 60, padLeft: 10, padRight: 10, padTop: 10, padBottom: 10 };

describe('scaleLinear', () => {
  it('nội suy tuyến tính hai đầu và điểm giữa', () => {
    expect(scaleLinear(0, 0, 10, 0, 100)).toBe(0);
    expect(scaleLinear(10, 0, 10, 0, 100)).toBe(100);
    expect(scaleLinear(5, 0, 10, 0, 100)).toBe(50);
  });

  it('miền phẳng (min = max) trả điểm giữa, không chia 0', () => {
    expect(scaleLinear(7, 7, 7, 0, 100)).toBe(50);
  });
});

describe('niceDomain', () => {
  it('nới hai đầu và làm tròn nguyên', () => {
    const d = niceDomain([25.5, 30.2]);
    expect(d.min).toBeLessThan(25.5);
    expect(d.max).toBeGreaterThan(30.2);
    expect(Number.isInteger(d.min)).toBe(true);
    expect(Number.isInteger(d.max)).toBe(true);
  });
});

describe('linePoints / linePath / areaPath', () => {
  it('điểm đầu ở padLeft, điểm cuối ở width - padRight, giá trị lớn có y nhỏ hơn', () => {
    const points = linePoints([10, 20, 30], frame, { min: 10, max: 30 });

    expect(points[0].x).toBe(10);
    expect(points[2].x).toBe(90);
    expect(points[2].y).toBeLessThan(points[0].y); // 30° vẽ cao hơn 10°
  });

  it('linePath bắt đầu bằng M và nối bằng L', () => {
    const points = linePoints([1, 2], frame, { min: 0, max: 3 });
    expect(linePath(points)).toMatch(/^M [\d.]+ [\d.]+ L [\d.]+ [\d.]+$/);
  });

  it('areaPath đóng path xuống đáy khung', () => {
    const points = linePoints([1, 2], frame, { min: 0, max: 3 });
    const area = areaPath(points, frame);
    expect(area.endsWith('Z')).toBe(true);
    expect(area).toContain(`L ${points[1].x} ${frame.height - frame.padBottom}`);
  });

  it('mảng rỗng trả path rỗng', () => {
    expect(linePath([])).toBe('');
    expect(areaPath([], frame)).toBe('');
  });
});
