import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';

import { AuthService } from './auth.service';

/*
  Guards decide whether a route can open. They return true (open it)
  or a UrlTree (go somewhere else instead). They are a convenience for
  the user: the real protection is the API, which checks the token on
  every call.
*/

/** Any logged-in user (client or admin). */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth
    .restoreSession()
    .pipe(map((user) => (user ? true : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }))));
};

/** Only the manicure. A client who tries is sent to her own area. */
export const adminGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.restoreSession().pipe(
    map((user) => {
      if (!user) {
        return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
      }
      return user.role === 'Super_admin' ? true : router.createUrlTree([auth.homeFor(user)]);
    }),
  );
};

/** Pages for visitors (like the login): a logged-in user goes to her home. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.restoreSession().pipe(map((user) => (user ? router.createUrlTree([auth.homeFor(user)]) : true)));
};

/** The root address: sends each user to the right place. */
export const homeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.restoreSession().pipe(map((user) => router.createUrlTree([auth.homeFor(user)])));
};
