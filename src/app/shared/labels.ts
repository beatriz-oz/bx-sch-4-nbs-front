// Translated names for the values that come from the API.
import { Addon, AppointmentStatus, Service } from '../core/api/types';

export const ADDON_LABELS: Record<Addon, string> = {
  'Broken nail': $localize`:@@addon.brokenNail:Broken nail (each)`,
  'Extra charm': $localize`:@@addon.extraCharm:Extra charm (each)`,
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  Scheduled: $localize`:@@status.scheduled:Scheduled`,
  Confirmed: $localize`:@@status.confirmed:Confirmed`,
  Completed: $localize`:@@status.completed:Completed`,
  Cancelled: $localize`:@@status.cancelled:Cancelled`,
  No_show: $localize`:@@status.noShow:No-show`,
};

export const SERVICE_LABELS: Record<Service, string> = {
  Application: $localize`:@@service.application:Application`,
  Maintenance: $localize`:@@service.maintenance:Maintenance`,
  Removal: $localize`:@@service.removal:Removal`,
  Other: $localize`:@@service.other:Other`,
};
