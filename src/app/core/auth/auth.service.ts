import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, map, Observable, of, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ActivationConfirm,
  ApiResponse,
  CheckInStart,
  CheckInVerify,
  CodeSent,
  Login,
  ProfileUpdate,
  TokenResult,
  User,
} from '../api/types';

const TOKEN_KEY = 'nbs_token';

function readStoredToken(): string | null {
  // localStorage can fail (private windows, blocked storage): the app must still work.
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Nothing to do: the session just won't survive a page reload.
  }
}

/**
 * Keeps who is logged in. Components read the signals below;
 * the interceptor reads token() to add it to every API call.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  readonly token = signal<string | null>(readStoredToken());
  readonly user = signal<User | null>(null);

  readonly isLoggedIn = computed(() => this.token() !== null);
  readonly isAdmin = computed(() => this.user()?.role === 'Super_admin');

  login(credentials: Login): Observable<User> {
    return this.http
      .post<ApiResponse<TokenResult>>(`${this.api}/auth/login`, credentials)
      .pipe(
        tap((response) => this.setToken(response.detail.access_token)),
        switchMap(() => this.loadMe()),
      );
  }

  // --- first booking (check-in) and becoming a regular client (activation) ---

  /** Sends a code to the email. Returns where it went, masked (e.g. "a***@gmail.com"). */
  checkInStart(data: CheckInStart): Observable<string> {
    return this.http
      .post<ApiResponse<CodeSent>>(`${this.api}/auth/checkin/start`, data)
      .pipe(map((response) => response.detail.sent_to));
  }

  checkInVerify(data: CheckInVerify): Observable<User> {
    return this.http.post<ApiResponse<TokenResult>>(`${this.api}/auth/checkin/verify`, data).pipe(
      tap((response) => this.setToken(response.detail.access_token)),
      switchMap(() => this.loadMe()),
    );
  }

  activationStart(phone: string): Observable<string> {
    return this.http
      .post<ApiResponse<CodeSent>>(`${this.api}/auth/activation/start`, { phone })
      .pipe(map((response) => response.detail.sent_to));
  }

  activationConfirm(data: ActivationConfirm): Observable<User> {
    return this.http.post<ApiResponse<TokenResult>>(`${this.api}/auth/activation/confirm`, data).pipe(
      tap((response) => this.setToken(response.detail.access_token)),
      switchMap(() => this.loadMe()),
    );
  }

  updateProfile(data: ProfileUpdate): Observable<User> {
    return this.http.patch<ApiResponse<User>>(`${this.api}/auth/me`, data).pipe(
      map((response) => response.detail),
      tap((user) => this.user.set(user)),
    );
  }

  /** Used after the check-in and the activation, which also return a token. */
  setToken(token: string): void {
    storeToken(token);
    this.token.set(token);
  }

  loadMe(): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.api}/auth/me`).pipe(
      map((response) => response.detail),
      tap((user) => this.user.set(user)),
    );
  }

  /**
   * After a page reload we still have the token, but not the user.
   * Loads it once; if the token is no longer valid, logs out.
   */
  restoreSession(): Observable<User | null> {
    if (!this.token()) {
      return of(null);
    }
    const user = this.user();
    if (user) {
      return of(user);
    }
    return this.loadMe().pipe(
      catchError(() => {
        this.logout();
        return of(null);
      }),
    );
  }

  /** Where each kind of user starts. */
  homeFor(user: User | null): string {
    if (!user) {
      return '/login';
    }
    return user.role === 'Super_admin' ? '/admin' : '/appointments';
  }

  logout(): void {
    storeToken(null);
    this.token.set(null);
    this.user.set(null);
  }
}
