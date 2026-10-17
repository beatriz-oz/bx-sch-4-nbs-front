import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/errors';
import { AuthService } from '../../../core/auth/auth.service';

/** Her details and the one preference she controls: the "agenda is open" emails. */
@Component({
  selector: 'app-profile-page',
  imports: [RouterLink],
  templateUrl: './profile.page.html',
})
export class ProfilePage {
  protected readonly auth = inject(AuthService);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  toggleAgendaEmails(): void {
    const user = this.auth.user();
    if (!user) {
      return;
    }
    const wanted = !user.wants_agenda_emails;
    this.saving.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.auth.updateProfile({ wants_agenda_emails: wanted }).subscribe({
      next: () => {
        this.saving.set(false);
        this.notice.set(
          wanted
            ? $localize`:@@profile.agendaOn:Done: we will email you when a new month opens.`
            : $localize`:@@profile.agendaOff:Done: you will no longer get the "agenda is open" emails.`,
        );
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(error));
      },
    });
  }
}
