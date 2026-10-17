import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';

import { STUDIO_TIME_ZONE } from '../core/dates';

export type StudioDateStyle = 'time' | 'weekday' | 'day' | 'dayLong' | 'dateTime' | 'month';

const OPTIONS: Record<StudioDateStyle, Intl.DateTimeFormatOptions> = {
  time: { hour: '2-digit', minute: '2-digit' },
  weekday: { weekday: 'long' },
  day: { day: 'numeric', month: 'short' },
  dayLong: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  dateTime: { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' },
  month: { month: 'long', year: 'numeric' },
};

/**
 * Shows a date in the studio's time zone and in the site's language.
 *   {{ appointment.scheduled_at | studioDate: 'time' }}   → 14:00
 *   {{ '2026-10-17' | studioDate: 'dayLong' }}            → Saturday, 17 October 2026
 */
@Pipe({ name: 'studioDate' })
export class StudioDatePipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(value: string | null | undefined, style: StudioDateStyle = 'dateTime'): string {
    if (!value) {
      return '';
    }
    // A plain day (YYYY-MM-DD) has no time: read it as UTC so it never moves to another day.
    const isPlainDay = value.length === 10;
    const date = new Date(isPlainDay ? `${value}T12:00:00Z` : value);
    const timeZone = isPlainDay ? 'UTC' : STUDIO_TIME_ZONE;
    return new Intl.DateTimeFormat(this.locale, { ...OPTIONS[style], timeZone }).format(date);
  }
}
