import { PriceList } from '../../../core/api/types';
import { suggestPrice } from './price-suggestion';

const at = '2026-10-01T00:00:00+01:00';
const prices: PriceList = {
  services: [
    { service: 'Application', nail_size: 'M', amount: '40.00', updated_at: at },
    { service: 'Maintenance', nail_size: 'M', amount: '35.00', updated_at: at },
    { service: 'Removal', nail_size: null, amount: '10.00', updated_at: at },
  ],
  nail_art: [{ nail_art_level: 'Level 2', amount: '8.00', updated_at: at }],
  addons: [
    { addon: 'Broken nail', amount: '1.50', updated_at: at },
    { addon: 'Extra charm', amount: '0.50', updated_at: at },
  ],
};

describe('suggestPrice', () => {
  it('adds service, nail art and broken nails', () => {
    expect(
      suggestPrice(prices, { service: 'Application', nailSize: 'M', nailArtLevel: 'Level 2', brokenNails: 3 }),
    ).toBe('52.50');
  });

  it('uses the flat price for a removal', () => {
    expect(suggestPrice(prices, { service: 'Removal', nailSize: null, nailArtLevel: null, brokenNails: 0 })).toBe('10.00');
  });

  it('has no suggestion for OTHER or while details are missing', () => {
    expect(suggestPrice(prices, { service: 'Other', nailSize: null, nailArtLevel: null, brokenNails: 0 })).toBeNull();
    expect(suggestPrice(prices, { service: 'Maintenance', nailSize: 'M', nailArtLevel: null, brokenNails: 0 })).toBeNull();
  });
});
