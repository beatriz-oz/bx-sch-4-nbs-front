import { AdminAppointment, Service } from '../../../core/api/types';
import { HOUR_HEIGHT, layoutDay, minutesAtOffset } from './calendar-layout';

const DURATION: Record<Service, number> = { Application: 180, Maintenance: 150, Removal: 60, Other: 60 };

function appointment(id: number, time: string, service: Service = 'Removal'): AdminAppointment {
  return {
    id,
    // October: Lisbon is UTC+1.
    scheduled_at: `2026-10-20T${time}:00+01:00`,
    status: 'Scheduled',
    service,
    nail_size: null,
    nail_art_level: null,
    broken_nails: 0,
    has_other_professional_nails: false,
    estimated_price: '10.00',
    final_price: null,
    notes: null,
    completion_notes: null,
    created_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    deposit_refunded_at: null,
    duration_minutes: DURATION[service],
    client: { id: 1, name: 'Ana', last_name: 'Silva', instagram: null, is_active: true, approved: true, studio_notes: null },
    deposit_paid: false,
    attendance_confirmed: false,
    deposit_overdue: false,
    refund_due: false,
  };
}

describe('calendar layout', () => {
  it('places a block by its Lisbon time and duration', () => {
    const [item] = layoutDay([appointment(1, '10:00')]); // removal: 1 hour
    expect(item.top).toBe(2 * HOUR_HEIGHT); // 2 hours after 08:00
    expect(item.height).toBe(HOUR_HEIGHT);
    expect(item.lanes).toBe(1);
  });

  it('puts overlapping appointments side by side', () => {
    const items = layoutDay([appointment(1, '10:00', 'Application'), appointment(2, '11:00')]);
    expect(items.map((item) => [item.appointment.id, item.lane, item.lanes])).toEqual([
      [1, 0, 2],
      [2, 1, 2],
    ]);
  });

  it('keeps one column when appointments do not overlap', () => {
    const items = layoutDay([appointment(1, '10:00'), appointment(2, '11:00'), appointment(3, '14:00')]);
    expect(items.every((item) => item.lanes === 1 && item.lane === 0)).toBe(true);
  });

  it('reuses a free column inside a busy group', () => {
    // 10-13 (long), 10:00-11:00, 11:00-12:00: the third one fits in the second column.
    const items = layoutDay([appointment(1, '10:00', 'Application'), appointment(2, '10:00'), appointment(3, '11:00')]);
    expect(items.find((item) => item.appointment.id === 3)?.lane).toBe(1);
    expect(items.every((item) => item.lanes === 2)).toBe(true);
  });

  it('turns a click into a time rounded to 15 minutes', () => {
    expect(minutesAtOffset(0)).toBe(8 * 60);
    expect(minutesAtOffset(HOUR_HEIGHT * 6 + 20)).toBe(14 * 60 + 15); // 14:18 → 14:15
  });
});
