import { NailArtLevel, NailSize, PriceList, Service } from '../../../core/api/types';

export interface PriceInput {
  service: Service;
  nailSize: NailSize | null;
  nailArtLevel: NailArtLevel | null;
  brokenNails: number;
}

/**
 * A starting price for a booking made by the studio, from the price table:
 * the same sum as the client's estimate (service + nail art + broken nails).
 * The manicure can always change it. OTHER has no table price (null).
 */
export function suggestPrice(prices: PriceList, input: PriceInput): string | null {
  const amount = (value: string | undefined) => (value === undefined ? null : Number(value));

  if (input.service === 'Other') {
    return null;
  }
  if (input.service === 'Removal') {
    const removal = amount(prices.services.find((p) => p.service === 'Removal')?.amount);
    return removal === null ? null : removal.toFixed(2);
  }
  if (!input.nailSize || !input.nailArtLevel) {
    return null;
  }

  const base = amount(prices.services.find((p) => p.service === input.service && p.nail_size === input.nailSize)?.amount);
  const art = amount(prices.nail_art.find((p) => p.nail_art_level === input.nailArtLevel)?.amount);
  const brokenNail = amount(prices.addons.find((p) => p.addon === 'Broken nail')?.amount) ?? 0;
  if (base === null || art === null) {
    return null;
  }

  // Cents as integers, so 0.1 + 0.2 problems never show up in a price.
  const cents = Math.round(base * 100) + Math.round(art * 100) + Math.round(brokenNail * 100) * input.brokenNails;
  return (cents / 100).toFixed(2);
}
