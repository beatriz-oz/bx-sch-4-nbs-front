import { Component, inject } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-admin-home-page',
  template: `
    <h2 i18n="@@admin.home.title" class="text-2xl font-semibold text-brand-700">Studio dashboard</h2>
    <p i18n="@@admin.home.placeholder" class="mt-2 text-gray-600">The appointments of the week will appear here.</p>
  `,
})
export class AdminHomePage {
  protected readonly auth = inject(AuthService);
}
