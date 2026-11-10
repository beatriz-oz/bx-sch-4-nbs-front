import { Component, inject } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';
import { ChangePasswordForm } from '../../../shared/change-password-form';

/** The studio's own account: her details and changing her password. */
@Component({
  selector: 'app-account-page',
  imports: [ChangePasswordForm],
  templateUrl: './account.page.html',
})
export class AccountPage {
  protected readonly auth = inject(AuthService);
}
