import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { apiErrorMessage } from '../core/api/errors';
import { ProfileUpdate } from '../core/api/types';
import { AuthService } from '../core/auth/auth.service';

/**
 * Her name and last name, as they appear to the studio (clients) or in the admin (the studio).
 * Clients also keep their Instagram here: it is how the studio knows them.
 */
@Component({
  selector: 'app-change-name-form',
  imports: [ReactiveFormsModule],
  templateUrl: './change-name-form.html',
})
export class ChangeNameForm implements OnInit {
  private readonly auth = inject(AuthService);

  readonly form = inject(NonNullableFormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(255)]],
    lastName: ['', [Validators.required, Validators.maxLength(255)]],
    instagram: ['', Validators.maxLength(255)],
  });

  /** The studio's own account has no Instagram here. */
  readonly isClient = computed(() => this.auth.user()?.role === 'User');

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly done = signal(false);

  ngOnInit(): void {
    this.fill();
  }

  submit(): void {
    this.done.set(false);
    const value = this.form.getRawValue();
    if (this.form.invalid || !value.name.trim() || !value.lastName.trim()) {
      this.form.markAllAsTouched();
      this.error.set($localize`:@@nameChange.required:Fill in your name and last name.`);
      return;
    }
    const changes: ProfileUpdate = { name: value.name.trim(), last_name: value.lastName.trim() };
    const instagram = value.instagram.trim().replace(/^@/, '');
    // Only when she typed one and it changed (an empty box never removes it).
    if (this.isClient() && instagram && instagram.toLowerCase() !== (this.auth.user()?.instagram ?? '')) {
      changes.instagram = instagram;
    }

    this.busy.set(true);
    this.error.set(null);
    this.auth.updateProfile(changes).subscribe({
      next: () => {
        this.busy.set(false);
        this.done.set(true);
        this.fill();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(this.messageFor(error));
      },
    });
  }

  private fill(): void {
    const user = this.auth.user();
    if (user) {
      this.form.setValue({ name: user.name, lastName: user.last_name, instagram: user.instagram ?? '' });
    }
  }

  private messageFor(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 409) {
        return $localize`:@@nameChange.instagramTaken:This Instagram is already used by another account.`;
      }
      if (error.status === 422) {
        return $localize`:@@nameChange.instagramInvalid:This Instagram is not valid.`;
      }
    }
    return apiErrorMessage(error);
  }
}
