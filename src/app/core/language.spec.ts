import { chosenLanguage, LANGUAGE_COOKIE, rememberLanguage } from './language';

describe('language choice (cookie)', () => {
  beforeEach(() => {
    document.cookie = `${LANGUAGE_COOKIE}=; path=/; max-age=0`;
  });

  it('is empty on a first visit', () => {
    expect(chosenLanguage()).toBeNull();
  });

  it('remembers the chosen language', () => {
    rememberLanguage('en');
    expect(chosenLanguage()).toBe('en');
    rememberLanguage('pt-PT');
    expect(chosenLanguage()).toBe('pt-PT');
  });

  it('ignores a value that is not one of the site languages', () => {
    document.cookie = `${LANGUAGE_COOKIE}=fr; path=/`;
    expect(chosenLanguage()).toBeNull();
  });
});
