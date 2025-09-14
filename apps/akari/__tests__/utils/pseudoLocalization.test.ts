import {
  pseudoLocalizeString,
  enhancedPseudoLocalizeString,
  pseudoLocalizeObject,
} from '@/utils/pseudoLocalization';

describe('pseudoLocalization utilities', () => {
  it('wraps text with brackets', () => {
    const result = pseudoLocalizeString('hello');
    expect(result).toBe('[hello]');
  });

  it('enhances text and preserves placeholders', () => {
    const result = enhancedPseudoLocalizeString('Hello {{name}}');
    expect(result).toBe('[Héllò {{name}}]');
  });

  it('recursively localizes objects', () => {
    const source = { greeting: 'Hello', nested: { message: 'Good day' } };
    const result = pseudoLocalizeObject(source) as {
      greeting: string;
      nested: { message: string };
    };
    expect(result.greeting).toBe('[Héllò]');
    expect(result.nested.message).toBe('[Gòòd dày]');
  });
});
