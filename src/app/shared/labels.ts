// Translated names for the values that come from the API.
import { Addon, AppointmentStatus, NailArtLevel, Service } from '../core/api/types';

/** What each nail art level includes (each level includes the ones below). */
export const ART_LEVEL_HINTS: Record<NailArtLevel, string> = {
  'Level 1': $localize`:@@art.level1.hint:Blooming gel, cat eye, simple design, fairy dust, french, lace, small charms`,
  'Level 2': $localize`:@@art.level2.hint:Airbrush, chrome, simple 3D, bubbles, velvet, medium design, up to 4 big charms`,
  'Level 3': $localize`:@@art.level3.hint:3D chrome, elaborate 3D, 3D velvet, elaborate design, claws, up to 8 big charms`,
};

/** The API describes the possible extras in English; these are the names shown on screen. */
export const EXTRA_LABELS: Record<string, string> = {
  'Complete removal (nails from another professional)': $localize`:@@extra.removal:Complete removal (nails from another professional)`,
  'Extra charm': $localize`:@@extra.charm:Extra charm`,
};

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
