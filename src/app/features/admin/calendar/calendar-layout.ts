import { AdminAppointment, Service } from '../../../core/api/types';
import { studioMinutes } from '../../../core/dates';

/*
  How the calendar is drawn. Change these values to change the agenda.
*/

/** The hours shown in the calendar. */
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 21;

/** Height of one hour, in pixels. */
export const HOUR_HEIGHT = 64;

/**
 * Expected duration of each service, in minutes. The API does not store
 * durations yet: these values only decide the height of each block.
 */
export const SERVICE_DURATION: Record<Service, number> = {
  Application: 180,
  Maintenance: 150,
  Removal: 60,
  Other: 60,
};

export interface PlacedAppointment {
  appointment: AdminAppointment;
  start: number; // minutes since midnight
  end: number;
  top: number; // pixels
  height: number; // pixels
  lane: number; // column inside the day, for overlapping blocks
  lanes: number; // how many columns the overlapping group needs
}

const PIXELS_PER_MINUTE = HOUR_HEIGHT / 60;

/**
 * Places the appointments of one day on the time grid.
 * Overlapping appointments (squeeze-ins) are shown side by side,
 * like in Google Calendar.
 */
export function layoutDay(appointments: AdminAppointment[]): PlacedAppointment[] {
  const items = appointments
    .map((appointment) => {
      const start = studioMinutes(appointment.scheduled_at);
      const end = start + SERVICE_DURATION[appointment.service];
      return { appointment, start, end };
    })
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const placed: PlacedAppointment[] = [];
  let group: PlacedAppointment[] = [];
  let groupEnd = -1;

  const closeGroup = () => {
    const lanes = Math.max(1, ...group.map((item) => item.lane + 1));
    group.forEach((item) => (item.lanes = lanes));
    group = [];
  };

  for (const item of items) {
    if (item.start >= groupEnd) {
      closeGroup();
    }
    // The first lane whose last block has already ended.
    const busyLanes = new Set(group.filter((other) => other.end > item.start).map((other) => other.lane));
    let lane = 0;
    while (busyLanes.has(lane)) {
      lane++;
    }

    const visibleStart = Math.max(item.start, DAY_START_HOUR * 60);
    const placedItem: PlacedAppointment = {
      ...item,
      top: (visibleStart - DAY_START_HOUR * 60) * PIXELS_PER_MINUTE,
      height: Math.max((item.end - visibleStart) * PIXELS_PER_MINUTE, 24),
      lane,
      lanes: 1,
    };
    group.push(placedItem);
    placed.push(placedItem);
    groupEnd = Math.max(groupEnd, item.end);
  }
  closeGroup();

  return placed;
}

/** The time (rounded to 15 minutes) under a click at `offsetY` pixels from the top of the grid. */
export function minutesAtOffset(offsetY: number): number {
  const minutes = DAY_START_HOUR * 60 + offsetY / PIXELS_PER_MINUTE;
  return Math.min(Math.round(minutes / 15) * 15, DAY_END_HOUR * 60 - 15);
}

/** Position of "now" on the grid, or null outside the visible hours. */
export function offsetOfMinutes(minutes: number): number | null {
  if (minutes < DAY_START_HOUR * 60 || minutes > DAY_END_HOUR * 60) {
    return null;
  }
  return (minutes - DAY_START_HOUR * 60) * PIXELS_PER_MINUTE;
}
