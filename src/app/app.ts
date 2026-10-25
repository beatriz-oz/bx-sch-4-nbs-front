import { Component, inject, LOCALE_ID } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService } from './core/auth/auth.service';

@Component({
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * The language is chosen when building: each one is its own copy of the site, under
   * /pt-PT/ and /en/. Switching opens the same page in the other copy (a full page load).
   */
  protected readonly isPortuguese = inject(LOCALE_ID).startsWith('pt');

  languageHref(language: 'pt-PT' | 'en'): string {
    return `/${language}${this.router.url}`;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
