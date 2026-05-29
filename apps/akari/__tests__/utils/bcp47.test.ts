import { buildLanguageOptions, getLanguageLabel } from '@/utils/bcp47';

describe('getLanguageLabel', () => {
  it('returns a localized display name for a known tag', () => {
    expect(getLanguageLabel('en', 'en')).toBe('English');
  });

  it('localizes into the requested UI locale', () => {
    // Spanish display name for English.
    expect(getLanguageLabel('en', 'es').toLowerCase()).toContain('ingl');
  });

  it('falls back to the tag for an invalid UI locale', () => {
    expect(getLanguageLabel('en', 'not-a-locale!!')).toBe('en');
  });
});

describe('buildLanguageOptions', () => {
  it('includes the common languages and sorts by label', () => {
    const options = buildLanguageOptions('en');
    expect(options.length).toBeGreaterThan(10);
    const labels = options.map((o) => o.label);
    expect(labels.toSorted((a, b) => a.localeCompare(b, 'en'))).toEqual(labels);
    expect(options.every((o) => typeof o.tag === 'string')).toBe(true);
  });

  it('de-duplicates extras already in the common set', () => {
    const options = buildLanguageOptions('en', ['en']);
    expect(options.filter((o) => o.tag === 'en')).toHaveLength(1);
  });

  it('appends extra tags not in the common set', () => {
    const options = buildLanguageOptions('en', ['eo']);
    expect(options.some((o) => o.tag === 'eo')).toBe(true);
  });

  it('attaches a native label for each option', () => {
    const options = buildLanguageOptions('en');
    const en = options.find((o) => o.tag === 'en');
    expect(en?.nativeLabel).toBe('English');
  });
});
