import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/errors';
import { AuthService } from '../../../core/auth/auth.service';
import { PhoneInput } from '../../../shared/phone-input';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, PhoneInput],
  templateUrl: './login.page.html',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly form = inject(NonNullableFormBuilder).group({
    phone: ['', Validators.required],
    password: ['', Validators.required],
  });

  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.error.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: (user) => this.router.navigateByUrl(this.safeReturnUrl() ?? this.auth.homeFor(user)),
      error: (error: unknown) => {
        this.submitting.set(false);
        this.error.set(
          error instanceof HttpErrorResponse && error.status === 401
            ? $localize`:@@login.error.invalid:Phone or password incorrect.`
            : apiErrorMessage(error),
        );
      },
    });
  }

  /** Only paths inside the site: a link like ?returnUrl=https://evil.com must not send her away. */
  private safeReturnUrl(): string | null {
    const url = this.route.snapshot.queryParamMap.get('returnUrl');
    return url && url.startsWith('/') && !url.startsWith('//') ? url : null;
  }
}
