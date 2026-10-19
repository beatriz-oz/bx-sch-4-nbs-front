/** 750 → "12h 30min", 60 → "1h", 45 → "45min", 0 → "0h". */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) {
    return '0h';
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) {
    return `${rest}min`;
  }
  return rest ? `${hours}h ${String(rest).padStart(2, '0')}min` : `${hours}h`;
}

/**
 * Clean axis ticks from 0 up to at least `max`: steps of 1, 2 or 5 × a power of ten,
 * about 3–4 of them (0 / 50 / 100 / 150, never 0 / 37 / 74).
 */
export function niceTicks(max: number, target = 4): number[] {
  if (max <= 0) {
    return [0, 1];
  }
  const rough = max / target;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= rough) ?? 10 * magnitude;
  const ticks = [0];
  while (ticks[ticks.length - 1] < max) {
    ticks.push(ticks[ticks.length - 1] + step);
  }
  return ticks;
}
