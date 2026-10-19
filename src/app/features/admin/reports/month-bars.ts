import { Component, computed, input, output, signal } from '@angular/core';

import { niceTicks } from './report-format';

/**
 * A column chart of the 12 months of a year, for ONE measure (money or hours:
 * two measures never share an axis). The selected month is highlighted and the
 * only one with its value written; the others show it on hover.
 */
@Component({
  selector: 'app-month-bars',
  templateUrl: './month-bars.html',
})
export class MonthBars {
  /** 12 values, January first. */
  readonly values = input.required<number[]>();
  readonly monthLabels = input.required<string[]>();
  /** How a value is written (€ or hours). */
  readonly format = input.required<(value: number) => string>();
  /** Selected month, 1–12. */
  readonly selected = input.required<number>();
  readonly select = output<number>();

  protected readonly chartHeight = 160;
  readonly hovered = signal<number | null>(null);

  readonly ticks = computed(() => niceTicks(Math.max(...this.values())));
  readonly top = computed(() => this.ticks()[this.ticks().length - 1]);

  /** Height of a column in pixels; a value above zero is always at least visible. */
  heightOf(value: number): number {
    if (value <= 0) {
      return 0;
    }
    return Math.max((value / this.top()) * this.chartHeight, 3);
  }

  tickBottom(tick: number): number {
    return (tick / this.top()) * this.chartHeight;
  }
}
