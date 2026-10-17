import { HttpErrorResponse } from '@angular/common/http';

/**
 * Turns an API error into a message for the screen.
 * The API answers errors in three shapes:
 *   {"detail": "message"}                 (HTTPException)
 *   {"status": "KO", "detail": "message"}  (our domain errors)
 *   {"detail": [{"msg": "...", ...}]}      (422, invalid fields)
 * The API messages are in English; screens that need a translated
 * message for a known case should check error.status themselves.
 */
export function apiErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return $localize`:@@error.network:Could not reach the server. Check your connection and try again.`;
    }

    const detail: unknown = error.error?.detail;
    if (typeof detail === 'string') {
      return detail;
    }
    if (Array.isArray(detail) && typeof detail[0]?.msg === 'string') {
      return detail[0].msg;
    }
  }

  return $localize`:@@error.unexpected:Something went wrong. Please try again.`;
}
