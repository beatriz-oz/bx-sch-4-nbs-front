import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, CanActivateFn, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { User } from '../api/types';
import { adminGuard, authGuard, guestGuard } from './auth.guards';
import { AuthService } from './auth.service';

const client: User = {
  id: 1,
  name: 'Ana',
  last_name: 'Silva',
  instagram: 'ana',
  email: 'ana@example.com',
  phone: '+351912345678',
  role: 'User',
  is_active: true,
  email_verified: true,
  wants_agenda_emails: true,
  can_create_password: false,
};
const admin: User = { ...client, id: 2, role: 'Super_admin' };

describe('auth guards', () => {
  let auth: AuthService;
  let router: Router;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    backend = TestBed.inject(HttpTestingController);
    auth.logout();
  });

  afterEach(() => backend.verify());

  async function run(guard: CanActivateFn, url = '/somewhere'): Promise<boolean | UrlTree> {
    const result = runInInjectionContext(TestBed.inject(EnvironmentInjector), () =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
    return isObservable(result) ? firstValueFrom(result as Observable<boolean | UrlTree>) : (result as boolean | UrlTree);
  }

  function path(result: boolean | UrlTree): string {
    return result instanceof UrlTree ? router.serializeUrl(result) : String(result);
  }

  it('sends a visitor to the login, remembering where she was going', async () => {
    expect(path(await run(authGuard, '/appointments'))).toBe('/login?returnUrl=%2Fappointments');
  });

  it('lets a logged-in client into her area', async () => {
    auth.setToken('t');
    auth.user.set(client);
    expect(await run(authGuard)).toBe(true);
  });

  it('keeps a client out of the admin', async () => {
    auth.setToken('t');
    auth.user.set(client);
    expect(path(await run(adminGuard))).toBe('/appointments');
  });

  it('lets the manicure into the admin', async () => {
    auth.setToken('t');
    auth.user.set(admin);
    expect(await run(adminGuard)).toBe(true);
  });

  it('sends a logged-in user away from the login page', async () => {
    auth.setToken('t');
    auth.user.set(admin);
    expect(path(await run(guestGuard))).toBe('/admin');
  });

  it('after a reload, loads the user from the token', async () => {
    auth.setToken('t');
    const result = run(adminGuard);
    backend.expectOne(`${environment.apiUrl}/auth/me`).flush({ status: 'OK', detail: admin });
    expect(await result).toBe(true);
  });

  it('logs out when the stored token is no longer valid', async () => {
    auth.setToken('expired');
    const result = run(authGuard, '/appointments');
    backend.expectOne(`${environment.apiUrl}/auth/me`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(path(await result)).toBe('/login?returnUrl=%2Fappointments');
    expect(auth.isLoggedIn()).toBe(false);
  });
});
