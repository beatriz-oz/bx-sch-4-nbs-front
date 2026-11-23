import { Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { apiErrorMessage } from '../core/api/errors';
import { AuthService } from '../core/auth/auth.service';

/** Her name and last name, as they appear to the studio (clients) or in the admin (the studio). */
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
  });

  readonly busy = signal(false);
  readonly error = signal<string | null>(null);
  readonly done = signal(false);

  ngOnInit(): void {
    const user = this.auth.user();
    if (user) {
      this.form.setValue({ name: user.name, lastName: user.last_name });
    }
  }

  submit(): void {
    this.done.set(false);
    const value = this.form.getRawValue();
    if (this.form.invalid || !value.name.trim() || !value.lastName.trim()) {
      this.form.markAllAsTouched();
      this.error.set($localize`:@@nameChange.required:Fill in your name and last name.`);
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    this.auth.updateProfile({ name: value.name.trim(), last_name: value.lastName.trim() }).subscribe({
      next: (user) => {
        this.busy.set(false);
        this.done.set(true);
        this.form.setValue({ name: user.name, lastName: user.last_name });
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.error.set(apiErrorMessage(error));
      },
    });
  }
}
