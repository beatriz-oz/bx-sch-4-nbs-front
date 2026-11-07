// The language the visitor chose, kept in a cookie (not localStorage) because the server reads it too:
// at "/" it opens the chosen copy of the site (/pt-PT/ or /en/) instead of guessing from the browser.

export type SiteLanguage = 'pt-PT' | 'en';

export const LANGUAGE_COOKIE = 'nbs_lang';
const ONE_YEAR = 60 * 60 * 24 * 365;

/** The language chosen before, or null on a first visit. */
export function chosenLanguage(): SiteLanguage | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${LANGUAGE_COOKIE}=([^;]*)`));
  const value = match ? decodeURIComponent(match[1]) : null;
  return value === 'pt-PT' || value === 'en' ? value : null;
}

export function rememberLanguage(language: SiteLanguage): void {
  document.cookie = `${LANGUAGE_COOKIE}=${language}; path=/; max-age=${ONE_YEAR}; SameSite=Lax`;
}
