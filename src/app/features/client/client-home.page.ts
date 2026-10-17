import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-client-home-page',
  imports: [RouterLink],
  template: `
    <div class="mx-auto max-w-5xl px-4 py-6">
      <h2 class="text-2xl font-semibold text-brand-700">
        <ng-container i18n="@@client.home.greeting">Hello, {{ auth.user()?.name }}!</ng-container>
      </h2>
      <p i18n="@@client.home.placeholder" class="mt-2 text-gray-600">Your appointments will appear here.</p>
      <a routerLink="/book" i18n="@@client.home.book"
        class="mt-6 inline-block rounded-full bg-gray-900 px-6 py-3 font-medium text-white hover:bg-gray-700">
        Book an appointment
      </a>
    </div>
  `,
})
export class ClientHomePage {
  protected readonly auth = inject(AuthService);
}
