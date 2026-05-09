import type { BlueskyLabel } from '@/bluesky-api';

import {
  ADULT_LABEL_VALUES,
  adultLabelsOn,
  hasAdultLabel,
} from '@/utils/adultLabels';

function label(val: string, neg = false): BlueskyLabel {
  return {
    val,
    src: 'did:plc:test-labeler',
    cts: '2026-01-01T00:00:00Z',
    uri: 'at://example/label/1',
    ...(neg ? { neg: true } : {}),
  };
}

describe('adultLabels', () => {
  it('treats undefined / empty label lists as non-adult', () => {
    expect(hasAdultLabel(undefined)).toBe(false);
    expect(hasAdultLabel([])).toBe(false);
    expect(adultLabelsOn(undefined)).toEqual([]);
    expect(adultLabelsOn([])).toEqual([]);
  });

  it.each(ADULT_LABEL_VALUES)('flags posts carrying the %s label', (value) => {
    expect(hasAdultLabel([label(value)])).toBe(true);
    expect(adultLabelsOn([label(value)])).toEqual([value]);
  });

  it('ignores non-adult labels', () => {
    expect(hasAdultLabel([label('spam'), label('bot')])).toBe(false);
    expect(adultLabelsOn([label('spam')])).toEqual([]);
  });

  it('skips negated labels — those represent a removal, not a present label', () => {
    expect(hasAdultLabel([label('porn', true)])).toBe(false);
    expect(adultLabelsOn([label('porn', true)])).toEqual([]);
  });

  it('dedupes when the same label value appears more than once', () => {
    expect(adultLabelsOn([label('nudity'), label('nudity')])).toEqual(['nudity']);
  });

  it('reads the label value from alternative property names', () => {
    const oddShape = { value: 'porn' } as unknown as BlueskyLabel;
    expect(hasAdultLabel([oddShape])).toBe(true);
  });
});
