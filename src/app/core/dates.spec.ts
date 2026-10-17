import { addDays, startOfWeek, studioDay, weekDays } from './dates';

describe('studio dates', () => {
  it('gives the Lisbon day of an instant, not the computer day', () => {
    // 23:30 UTC in summer is already 00:30 of the next day in Lisbon.
    expect(studioDay('2026-07-14T23:30:00Z')).toBe('2026-07-15');
    // In winter Lisbon is on UTC.
    expect(studioDay('2026-12-14T23:30:00Z')).toBe('2026-12-14');
  });

  it('reads the offset that the API sends', () => {
    expect(studioDay('2026-10-06T10:00:00+01:00')).toBe('2026-10-06');
  });

  it('adds days across the end of summer time without skipping', () => {
    // Summer time ends on 25 October 2026.
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('starts the week on Monday', () => {
    expect(startOfWeek('2026-10-17')).toBe('2026-10-12'); // Saturday
    expect(startOfWeek('2026-10-12')).toBe('2026-10-12'); // Monday
    expect(startOfWeek('2026-10-18')).toBe('2026-10-12'); // Sunday
  });

  it('lists the 7 days of a week', () => {
    expect(weekDays('2026-10-19')).toEqual([
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
    ]);
  });
});
