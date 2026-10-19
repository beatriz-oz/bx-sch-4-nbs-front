import { formatDuration, niceTicks } from './report-format';

describe('report formatting', () => {
  it('writes durations in hours and minutes', () => {
    expect(formatDuration(750)).toBe('12h 30min');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(45)).toBe('45min');
    expect(formatDuration(65)).toBe('1h 05min');
    expect(formatDuration(0)).toBe('0h');
  });

  it('makes clean axis ticks that cover the maximum', () => {
    expect(niceTicks(1840)).toEqual([0, 500, 1000, 1500, 2000]);
    expect(niceTicks(37)).toEqual([0, 10, 20, 30, 40]);
    expect(niceTicks(8)).toEqual([0, 2, 4, 6, 8]);
  });

  it('still draws an axis for an empty year', () => {
    expect(niceTicks(0)).toEqual([0, 1]);
  });
});
