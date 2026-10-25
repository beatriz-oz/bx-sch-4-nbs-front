import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Addon,
  AdminAppointment,
  AdminPayments,
  AgendaMonth,
  ApiResponse,
  AppointmentStatus,
  Client,
  ClientOverview,
  ClientProfile,
  Expense,
  ExpenseSet,
  FinalPriceDetails,
  FinalPriceEstimate,
  MonthPublished,
  NailArtLevel,
  NailSize,
  Policy,
  PreApprovedInstagram,
  PriceList,
  ScheduleException,
  ScheduleExceptionSet,
  DaySlotsSet,
  Service,
  StudioAppointment,
  StudioAppointmentDetails,
  YearReport,
} from '../../core/api/types';

/** The admin endpoints for appointments. Each method returns just the "detail". */
@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/admin/appointments`;

  list(startDate: string, endDate: string, status?: AppointmentStatus): Observable<AdminAppointment[]> {
    const params: Record<string, string> = { start_date: startDate, end_date: endDate };
    if (status) {
      params['status'] = status;
    }
    return this.http.get<ApiResponse<AdminAppointment[]>>(this.url, { params }).pipe(map((r) => r.detail));
  }

  confirmDeposit(id: number): Observable<AdminAppointment> {
    return this.post(`${id}/deposit`, null);
  }

  cancel(id: number, message: string | null): Observable<AdminAppointment> {
    return this.post(`${id}/cancel`, message ? { message } : null);
  }

  estimate(id: number, details: FinalPriceDetails): Observable<FinalPriceEstimate> {
    return this.http
      .post<ApiResponse<FinalPriceEstimate>>(`${this.url}/${id}/estimate`, details)
      .pipe(map((r) => r.detail));
  }

  complete(
    id: number,
    finalPrice: string,
    durationMinutes: number,
    notes: string | null,
    approveClient: boolean,
  ): Observable<AdminAppointment> {
    return this.post(`${id}/complete`, {
      final_price: finalPrice,
      duration_minutes: durationMinutes,
      notes,
      approve_client: approveClient,
    });
  }

  noShow(id: number): Observable<AdminAppointment> {
    return this.post(`${id}/no-show`, null);
  }

  book(data: StudioAppointment): Observable<AdminAppointment> {
    return this.http.post<ApiResponse<AdminAppointment>>(this.url, data).pipe(map((r) => r.detail));
  }

  /** Changes an active appointment (any day and time). The client is emailed when the time changes. */
  change(id: number, data: StudioAppointmentDetails): Observable<AdminAppointment> {
    return this.http.put<ApiResponse<AdminAppointment>>(`${this.url}/${id}`, data).pipe(map((r) => r.detail));
  }

  searchClients(search: string): Observable<Client[]> {
    return this.http
      .get<ApiResponse<Client[]>>(`${environment.apiUrl}/admin/clients`, { params: { search } })
      .pipe(map((r) => r.detail));
  }

  prices(): Observable<PriceList> {
    return this.http.get<ApiResponse<PriceList>>(`${environment.apiUrl}/prices`).pipe(map((r) => r.detail));
  }

  preApproved(): Observable<PreApprovedInstagram[]> {
    return this.http
      .get<ApiResponse<PreApprovedInstagram[]>>(`${environment.apiUrl}/admin/pre-approved-instagrams`)
      .pipe(map((r) => r.detail));
  }

  addPreApproved(instagram: string): Observable<PreApprovedInstagram> {
    return this.http
      .post<ApiResponse<PreApprovedInstagram>>(`${environment.apiUrl}/admin/pre-approved-instagrams`, { instagram })
      .pipe(map((r) => r.detail));
  }

  removePreApproved(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<string>>(`${environment.apiUrl}/admin/pre-approved-instagrams/${id}`)
      .pipe(map(() => undefined));
  }

  // --- the studio agenda (which days and slots clients can book) ---

  agenda(year: number, month: number): Observable<AgendaMonth> {
    return this.http
      .get<ApiResponse<AgendaMonth>>(`${environment.apiUrl}/admin/agenda`, { params: { year, month } })
      .pipe(map((r) => r.detail));
  }

  exceptions(year: number, month: number): Observable<ScheduleException[]> {
    return this.http
      .get<ApiResponse<ScheduleException[]>>(`${environment.apiUrl}/admin/schedule-exceptions`, { params: { year, month } })
      .pipe(map((r) => r.detail));
  }

  /** Opens or closes a whole day (slot_time null) or one slot. The warning tells about bookings already there. */
  setException(data: ScheduleExceptionSet): Observable<string | null> {
    return this.http
      .put<ApiResponse<ScheduleException> & { warning?: string | null }>(`${environment.apiUrl}/admin/schedule-exceptions`, data)
      .pipe(map((r) => r.warning ?? null));
  }

  /** The times of one day. An empty list goes back to the default times. */
  setDaySlots(data: DaySlotsSet): Observable<string | null> {
    return this.http
      .put<ApiResponse<string[]> & { warning?: string | null }>(`${environment.apiUrl}/admin/day-slots`, data)
      .pipe(map((r) => r.warning ?? null));
  }

  removeException(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<string>>(`${environment.apiUrl}/admin/schedule-exceptions/${id}`)
      .pipe(map(() => undefined));
  }

  publishMonth(year: number, month: number): Observable<MonthPublished> {
    return this.http
      .post<ApiResponse<MonthPublished>>(`${environment.apiUrl}/admin/published-months`, { year, month })
      .pipe(map((r) => r.detail));
  }

  // --- prices and policies ---

  updateServicePrice(service: Service, nailSize: NailSize | null, amount: string): Observable<unknown> {
    return this.http.put(`${environment.apiUrl}/admin/prices/service`, { service, nail_size: nailSize, amount });
  }

  updateNailArtPrice(level: NailArtLevel, amount: string): Observable<unknown> {
    return this.http.put(`${environment.apiUrl}/admin/prices/nail-art`, { nail_art_level: level, amount });
  }

  updateAddonPrice(addon: Addon, amount: string): Observable<unknown> {
    return this.http.put(`${environment.apiUrl}/admin/prices/addon`, { addon, amount });
  }

  currentPolicy(): Observable<Policy> {
    return this.http.get<ApiResponse<Policy>>(`${environment.apiUrl}/policies/current`).pipe(map((r) => r.detail));
  }

  publishPolicy(version: string, content: string): Observable<Policy> {
    return this.http
      .post<ApiResponse<Policy>>(`${environment.apiUrl}/admin/policies`, { version, content })
      .pipe(map((r) => r.detail));
  }

  // --- payments and clients ---

  payments(): Observable<AdminPayments> {
    return this.http.get<ApiResponse<AdminPayments>>(`${environment.apiUrl}/admin/payments`).pipe(map((r) => r.detail));
  }

  markRefunded(id: number): Observable<AdminAppointment> {
    return this.post(`${id}/refund`, null);
  }

  clientsOverview(group: 'registered' | 'pending'): Observable<ClientOverview[]> {
    return this.http
      .get<ApiResponse<ClientOverview[]>>(`${environment.apiUrl}/admin/clients/overview`, { params: { group } })
      .pipe(map((r) => r.detail));
  }

  clientProfile(id: number): Observable<ClientProfile> {
    return this.http
      .get<ApiResponse<ClientProfile>>(`${environment.apiUrl}/admin/clients/${id}`)
      .pipe(map((r) => r.detail));
  }

  /** Allows (or no longer allows) a client to come back and create a password. */
  setApproval(id: number, approved: boolean): Observable<ClientProfile> {
    return this.http
      .put<ApiResponse<ClientProfile>>(`${environment.apiUrl}/admin/clients/${id}/approval`, { approved })
      .pipe(map((r) => r.detail));
  }

  // --- expenses (subtracted from the income in the reports) ---

  expenses(year: number, month: number): Observable<Expense[]> {
    return this.http
      .get<ApiResponse<Expense[]>>(`${environment.apiUrl}/admin/expenses`, { params: { year, month } })
      .pipe(map((r) => r.detail));
  }

  addExpense(data: ExpenseSet): Observable<Expense> {
    return this.http.post<ApiResponse<Expense>>(`${environment.apiUrl}/admin/expenses`, data).pipe(map((r) => r.detail));
  }

  updateExpense(id: number, data: ExpenseSet): Observable<Expense> {
    return this.http
      .put<ApiResponse<Expense>>(`${environment.apiUrl}/admin/expenses/${id}`, data)
      .pipe(map((r) => r.detail));
  }

  removeExpense(id: number): Observable<void> {
    return this.http
      .delete<ApiResponse<string>>(`${environment.apiUrl}/admin/expenses/${id}`)
      .pipe(map(() => undefined));
  }

  yearReport(year: number): Observable<YearReport> {
    return this.http
      .get<ApiResponse<YearReport>>(`${environment.apiUrl}/admin/reports`, { params: { year } })
      .pipe(map((r) => r.detail));
  }

  private post(path: string, body: unknown): Observable<AdminAppointment> {
    return this.http.post<ApiResponse<AdminAppointment>>(`${this.url}/${path}`, body).pipe(map((r) => r.detail));
  }
}
