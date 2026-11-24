import { Component, HostListener, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, tap } from 'rxjs';

/**
 * The admin frame: the side menu and the page on the right. On phones the menu hides behind
 * a hamburger (top left) and opens as a drawer; choosing a page closes it.
 */
@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './admin-shell.html',
})
export class AdminShell {
  private readonly router = inject(Router);

  readonly menuOpen = signal(false);

  /** The page on screen, next to the hamburger: its route title without " · Nails by Scooby". */
  readonly currentTitle = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      tap(() => this.menuOpen.set(false)),
      map(() => this.pageTitle()),
    ),
    { initialValue: this.pageTitle() },
  );

  /** The title of the deepest route (the page itself), as the routes define it. */
  private pageTitle(): string {
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) {
      route = route.firstChild;
    }
    return (route.title ?? '').split(' · ')[0];
  }

  @HostListener('document:keydown.escape')
  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
