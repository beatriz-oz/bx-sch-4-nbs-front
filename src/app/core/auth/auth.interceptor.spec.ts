import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let auth: AuthService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    auth.logout();
  });

  afterEach(() => backend.verify());

  it('adds the token to API calls', () => {
    auth.setToken('abc');
    http.get(`${environment.apiUrl}/auth/me`).subscribe();

    const request = backend.expectOne(`${environment.apiUrl}/auth/me`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer abc');
    request.flush({});
  });

  it('does not send the token to other sites', () => {
    auth.setToken('abc');
    http.get('https://example.com/data').subscribe();

    const request = backend.expectOne('https://example.com/data');
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('sends no header when nobody is logged in', () => {
    http.get(`${environment.apiUrl}/prices`).subscribe();

    const request = backend.expectOne(`${environment.apiUrl}/prices`);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });

  it('logs out when the API answers 401', () => {
    auth.setToken('expired');
    http.get(`${environment.apiUrl}/auth/me`).subscribe({ error: () => undefined });

    backend
      .expectOne(`${environment.apiUrl}/auth/me`)
      .flush({ detail: 'Invalid token' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.isLoggedIn()).toBe(false);
  });
});
