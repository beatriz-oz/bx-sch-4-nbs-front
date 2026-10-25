import { CurrencyPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { apiErrorMessage } from '../../../core/api/errors';
import { Expense, ExpenseCategory } from '../../../core/api/types';
import { studioToday } from '../../../core/dates';
import { EXPENSE_CATEGORY_LABELS } from '../../../shared/labels';
import { StudioDatePipe } from '../../../shared/studio-date.pipe';
import { AdminApiService } from '../admin-api.service';

/**
 * What the studio spent, month by month. The reports subtract it from the income
 * to show the profit.
 */
@Component({
  selector: 'app-expenses-page',
  imports: [CurrencyPipe, ReactiveFormsModule, RouterLink, StudioDatePipe],
  templateUrl: './expenses.page.html',
})
export class ExpensesPage {
  private readonly api = inject(AdminApiService);
  private readonly fb = inject(NonNullableFormBuilder);

  protected readonly categoryLabels = EXPENSE_CATEGORY_LABELS;
  protected readonly categories = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];
  protected readonly today = studioToday();

  // The reports link here with ?year=&month= to open the month being looked at.
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;
  readonly year = signal(Number(this.query.get('year')) || Number(this.today.slice(0, 4)));
  readonly month = signal(Number(this.query.get('month')) || Number(this.today.slice(5, 7)));

  readonly expenses = signal<Expense[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  /** The expense being corrected in the form, or null when adding a new one. */
  readonly editing = signal<Expense | null>(null);

  readonly firstDay = computed(() => `${this.year()}-${String(this.month()).padStart(2, '0')}-01`);

  readonly form = this.fb.group({
    day: [this.defaultDay(), Validators.required],
    description: ['', [Validators.required, Validators.maxLength(200)]],
    category: ['Products' as ExpenseCategory, Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  readonly total = computed(() => this.expenses().reduce((sum, expense) => sum + Number(expense.amount), 0));

  constructor() {
    this.load();
  }

  move(direction: -1 | 1): void {
    const index = this.year() * 12 + (this.month() - 1) + direction;
    this.year.set(Math.floor(index / 12));
    this.month.set((index % 12) + 1);
    this.cancelEdit();
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.expenses(this.year(), this.month()).subscribe({
      next: (expenses) => {
        this.expenses.set(expenses);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.error.set(apiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  edit(expense: Expense): void {
    this.editing.set(expense);
    this.error.set(null);
    this.form.setValue({
      day: expense.day,
      description: expense.description,
      category: expense.category,
      amount: Number(expense.amount),
    });
  }

  cancelEdit(): void {
    this.editing.set(null);
    this.form.reset({ day: this.defaultDay(), description: '', category: 'Products', amount: null });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const data = {
      day: value.day,
      description: value.description,
      category: value.category,
      amount: Number(value.amount).toFixed(2),
    };
    const editing = this.editing();
    const request = editing ? this.api.updateExpense(editing.id, data) : this.api.addExpense(data);

    this.saving.set(true);
    this.error.set(null);
    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.cancelEdit();
        // Saved in another month: go there, so she sees it.
        this.year.set(Number(saved.day.slice(0, 4)));
        this.month.set(Number(saved.day.slice(5, 7)));
        this.load();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.error.set(apiErrorMessage(error));
      },
    });
  }

  remove(expense: Expense): void {
    const question = $localize`:@@expenses.removeQuestion:Remove "${expense.description}:description:"?`;
    if (!confirm(question)) {
      return;
    }
    this.api.removeExpense(expense.id).subscribe({
      next: () => {
        if (this.editing()?.id === expense.id) {
          this.cancelEdit();
        }
        this.load();
      },
      error: (error: unknown) => this.error.set(apiErrorMessage(error)),
    });
  }

  /** Today when looking at this month, otherwise the 1st of the month shown. */
  private defaultDay(): string {
    const first = this.firstDay();
    return this.today.startsWith(first.slice(0, 7)) ? this.today : first;
  }
}
