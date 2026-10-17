import { Component, inject } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-client-home-page',
  template: `
    <h2 class="text-2xl font-semibold text-brand-700">
      <ng-container i18n="@@client.home.greeting">Hello, {{ auth.user()?.name }}!</ng-container>
    </h2>
    <p i18n="@@client.home.placeholder" class="mt-2 text-gray-600">Your appointments will appear here.</p>
  `,
})
export class ClientHomePage {
  protected readonly auth = inject(AuthService);
}
