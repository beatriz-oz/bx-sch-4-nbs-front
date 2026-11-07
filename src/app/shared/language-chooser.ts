import { afterNextRender, Component, ElementRef, inject, LOCALE_ID, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';

import { chosenLanguage, rememberLanguage, SiteLanguage } from '../core/language';

/**
 * On the first visit, a small window asks: Português or English. The answer is remembered
 * (cookie), so it never asks again; the PT | EN in the header still switches at any time.
 * Each language is its own copy of the site, so choosing the other one opens the same page there.
 */
@Component({
  selector: 'app-language-chooser',
  templateUrl: './language-chooser.html',
  host: { '(document:keydown.escape)': 'keepCurrent()' },
})
export class LanguageChooser {
  private readonly router = inject(Router);
  private readonly current: SiteLanguage = inject(LOCALE_ID).startsWith('pt') ? 'pt-PT' : 'en';

  readonly visible = signal(chosenLanguage() === null);
  private readonly firstButton = viewChild<ElementRef<HTMLButtonElement>>('first');

  constructor() {
    // The window takes the keyboard focus, so it can be answered without a mouse.
    afterNextRender(() => this.firstButton()?.nativeElement.focus());
  }

  choose(language: SiteLanguage): void {
    rememberLanguage(language);
    if (language === this.current) {
      this.visible.set(false);
    } else {
      window.location.href = `/${language}${this.router.url}`;
    }
  }

  /** Escape or a click outside: stay in this language (and do not ask again). */
  keepCurrent(): void {
    if (this.visible()) {
      this.choose(this.current);
    }
  }
}
