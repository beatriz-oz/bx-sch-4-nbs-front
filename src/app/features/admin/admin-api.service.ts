import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AdminAppointment,
  ApiResponse,
  AppointmentStatus,
  Client,
  FinalPriceDetails,
  FinalPriceEstimate,
  PreApprovedInstagram,
  PriceList,
  StudioAppointment,
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

  complete(id: number, finalPrice: string): Observable<AdminAppointment> {
    return this.post(`${id}/complete`, { final_price: finalPrice });
  }

  noShow(id: number): Observable<AdminAppointment> {
    return this.post(`${id}/no-show`, null);
  }

  book(data: StudioAppointment): Observable<AdminAppointment> {
    return this.http.post<ApiResponse<AdminAppointment>>(this.url, data).pipe(map((r) => r.detail));
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

  private post(path: string, body: unknown): Observable<AdminAppointment> {
    return this.http.post<ApiResponse<AdminAppointment>>(`${this.url}/${path}`, body).pipe(map((r) => r.detail));
  }
}
