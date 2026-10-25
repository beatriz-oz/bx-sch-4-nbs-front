import { TestBed } from '@angular/core/testing';

import { PhoneInput } from './phone-input';

describe('PhoneInput', () => {
  let phone: PhoneInput;
  let value: string | undefined;

  beforeEach(() => {
    phone = TestBed.createComponent(PhoneInput).componentInstance;
    value = undefined;
    phone.registerOnChange((v) => (value = v));
  });

  it('splits a stored number into country and number', () => {
    phone.writeValue('+351912345678');
    expect(phone.country()).toBe('PT');
    expect(phone.number()).toBe('912345678');
  });

  it('prefers the longest code (+351 is Portugal, not +35…)', () => {
    phone.writeValue('+353871234567');
    expect(phone.country()).toBe('IE');
  });

  it('reads +1 as the United States', () => {
    phone.writeValue('+15551234567');
    expect(phone.country()).toBe('US');
  });

  it('keeps an unknown code whole, as "other country"', () => {
    phone.writeValue('+81312345678');
    expect(phone.country()).toBe('other');
    expect(phone.number()).toBe('+81312345678');
  });

  it('joins the country code and the digits typed', () => {
    phone.chooseCountry('BR');
    phone.typeNumber('(11) 98765-4321');
    expect(value).toBe('+5511987654321');
  });

  it('gives an empty value while there is no number, so "required" still works', () => {
    phone.typeNumber('   ');
    expect(value).toBe('');
  });

  it('sends "other country" as typed, without spaces', () => {
    phone.chooseCountry('other');
    phone.typeNumber('+81 3 1234 5678');
    expect(value).toBe('+81312345678');
  });
});
