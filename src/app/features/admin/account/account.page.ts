import { Component, inject } from '@angular/core';

import { AuthService } from '../../../core/auth/auth.service';
import { ChangeEmailForm } from '../../../shared/change-email-form';
import { ChangePasswordForm } from '../../../shared/change-password-form';
import { ChangePhoneForm } from '../../../shared/change-phone-form';

/** The studio's own account: her details, and changing her password, email and phone. */
@Component({
  selector: 'app-account-page',
  imports: [ChangePasswordForm, ChangeEmailForm, ChangePhoneForm],
  templateUrl: './account.page.html',
})
export class AccountPage {
  protected readonly auth = inject(AuthService);
}
