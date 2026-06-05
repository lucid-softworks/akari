import { Linking } from 'react-native';

import {
  isExternalUrl,
  openExternalLink,
  registerExternalLinkConfirm,
} from '@/utils/externalLink';

jest.mock('react-native', () => ({
  Linking: { openURL: jest.fn().mockResolvedValue(undefined) },
}));

const openURL = Linking.openURL as jest.Mock;

describe('isExternalUrl', () => {
  it('treats http(s) URLs as external', () => {
    expect(isExternalUrl('http://example.com')).toBe(true);
    expect(isExternalUrl('https://example.com')).toBe(true);
    expect(isExternalUrl('  HTTPS://example.com  ')).toBe(true);
  });

  it('treats non-http schemes and empty strings as internal', () => {
    expect(isExternalUrl('')).toBe(false);
    expect(isExternalUrl('mailto:a@b.com')).toBe(false);
    expect(isExternalUrl('tel:123')).toBe(false);
    expect(isExternalUrl('bsky.app/profile/x')).toBe(false);
  });
});

describe('openExternalLink', () => {
  afterEach(() => {
    registerExternalLinkConfirm(null);
    openURL.mockClear();
  });

  it('opens non-external URLs directly without a confirm host', async () => {
    await openExternalLink('mailto:a@b.com');
    expect(openURL).toHaveBeenCalledWith('mailto:a@b.com');
  });

  it('opens external URLs directly when no host is registered', async () => {
    await openExternalLink('https://example.com');
    expect(openURL).toHaveBeenCalledWith('https://example.com');
  });

  it('opens the URL when the host confirms', async () => {
    registerExternalLinkConfirm((req) => req.resolve(true));
    await openExternalLink('https://example.com');
    expect(openURL).toHaveBeenCalledWith('https://example.com');
  });

  it('does not open the URL when the host cancels', async () => {
    registerExternalLinkConfirm((req) => req.resolve(false));
    await openExternalLink('https://example.com');
    expect(openURL).not.toHaveBeenCalled();
  });
});
