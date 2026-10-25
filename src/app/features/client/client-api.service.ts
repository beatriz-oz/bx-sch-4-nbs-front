import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiResponse,
  Appointment,
  AppointmentDetails,
  AvailableDay,
  Booking,
  Cancellation,
  Estimate,
  NailSize,
  NewAppointment,
  Policy,
  PriceList,
  PriceSimulation,
} from '../../core/api/types';

/** The endpoints a client uses. Each method returns just the "detail". */
@Injectable({ providedIn: 'root' })
export class ClientApiService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  /** Free slots of a published month (empty when the month is not open yet). XL/XXL only get their slots. */
  availability(year: number, month: number, nailSize: NailSize | null): Observable<AvailableDay[]> {
    const params: Record<string, string | number> = { year, month };
    if (nailSize) {
      params['nail_size'] = nailSize;
    }
    return this.http
      .get<ApiResponse<AvailableDay[]>>(`${this.api}/appointments/availability`, { params })
      .pipe(map((r) => r.detail));
  }

  estimate(details: AppointmentDetails): Observable<Estimate> {
    return this.http.post<ApiResponse<Estimate>>(`${this.api}/appointments/estimate`, details).pipe(map((r) => r.detail));
  }

  /** Changes her appointment (more than 48h before; the API decides). The price is calculated again. */
  changeAppointment(id: number, details: AppointmentDetails): Observable<Booking> {
    return this.http
      .put<ApiResponse<Booking>>(`${this.api}/appointments/${id}`, details)
      .pipe(map((r) => r.detail));
  }

  /** Public: the estimated price of a service, for anyone (no login). */
  simulatePrice(choices: PriceSimulation): Observable<Estimate> {
    const params: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(choices)) {
      if (value !== null && value !== undefined) {
        params[key] = value;
      }
    }
    return this.http
      .get<ApiResponse<Estimate>>(`${this.api}/prices/simulate`, { params })
      .pipe(map((r) => r.detail));
  }

  prices(): Observable<PriceList> {
    return this.http.get<ApiResponse<PriceList>>(`${this.api}/prices`).pipe(map((r) => r.detail));
  }

  currentPolicy(): Observable<Policy> {
    return this.http.get<ApiResponse<Policy>>(`${this.api}/policies/current`).pipe(map((r) => r.detail));
  }

  book(data: NewAppointment): Observable<Booking> {
    return this.http.post<ApiResponse<Booking>>(`${this.api}/appointments`, data).pipe(map((r) => r.detail));
  }

  myAppointments(): Observable<Appointment[]> {
    return this.http.get<ApiResponse<Appointment[]>>(`${this.api}/appointments`).pipe(map((r) => r.detail));
  }

  cancel(id: number, acceptDepositLoss: boolean): Observable<Cancellation> {
    return this.http
      .post<ApiResponse<Cancellation>>(`${this.api}/appointments/${id}/cancel`, { accept_deposit_loss: acceptDepositLoss })
      .pipe(map((r) => r.detail));
  }

  confirmAttendance(token: string): Observable<Appointment> {
    return this.http
      .post<ApiResponse<Appointment>>(`${this.api}/appointments/attendance/confirm`, { token })
      .pipe(map((r) => r.detail));
  }
}
