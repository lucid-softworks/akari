import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import type { BlueskyVerification } from '@/bluesky-api';
import { VerificationBadge, computeVerificationTier } from '@/components/VerificationBadge';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/ui/IconSymbol', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    IconSymbol: ({ name, color }: { name: string; color: string }) => (
      <Text testID={`icon-${name}`}>{`${name}:${color}`}</Text>
    ),
  };
});

jest.mock('@/components/VerifiersSheet', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    VerifiersSheet: jest.fn(({ visible }: { visible: boolean }) =>
      visible ? <Text testID="verifiers-sheet-open">open</Text> : null,
    ),
  };
});

const mockUseVerifiersForDid = jest.fn();
jest.mock('@/hooks/queries/useVerifiersForDid', () => ({
  useVerifiersForDid: (...args: unknown[]) => mockUseVerifiersForDid(...args),
}));

const mockUseVerificationSettings = jest.fn();
jest.mock('@/hooks/useVerificationSettings', () => ({
  useVerificationSettings: () => mockUseVerificationSettings(),
}));

const validVerification: BlueskyVerification = {
  verifiedStatus: 'valid',
  trustedVerifierStatus: 'none',
  verifications: [
    {
      issuer: 'did:plc:appview-verifier',
      uri: 'at://appview-verifier/app.bsky.graph.verification/1',
      isValid: true,
      createdAt: '2025-04-01T00:00:00Z',
    },
  ],
};

beforeEach(() => {
  mockUseVerifiersForDid.mockReturnValue({ data: [] });
  mockUseVerificationSettings.mockReturnValue({
    badgesEnabled: true,
    trustedVerifierDids: [],
  });
});

describe('computeVerificationTier', () => {
  it('returns "none" when nobody has verified the subject', () => {
    expect(computeVerificationTier([], [])).toBe('none');
    expect(computeVerificationTier([], ['did:plc:trusted'])).toBe('none');
  });

  it('returns "blue" when verifications exist but the trusted list is empty', () => {
    expect(computeVerificationTier(['did:plc:rando'], [])).toBe('blue');
  });

  it('returns "blue" when no trusted verifier vouched', () => {
    expect(computeVerificationTier(['did:plc:rando'], ['did:plc:trusted'])).toBe('blue');
  });

  it('returns "silver" when at least one (but not all) trusted verifiers vouched', () => {
    const all = ['did:plc:trusted-a', 'did:plc:rando'];
    const trusted = ['did:plc:trusted-a', 'did:plc:trusted-b'];
    expect(computeVerificationTier(all, trusted)).toBe('silver');
  });

  it('returns "gold" when every trusted verifier vouched', () => {
    const all = ['did:plc:trusted-a', 'did:plc:trusted-b', 'did:plc:rando'];
    const trusted = ['did:plc:trusted-a', 'did:plc:trusted-b'];
    expect(computeVerificationTier(all, trusted)).toBe('gold');
  });

  it('does not return "gold" with an empty trusted list (vacuous-truth guard)', () => {
    expect(computeVerificationTier(['did:plc:rando'], [])).toBe('blue');
  });

  it('returns "silver" (not gold) when the trusted list has only one entry', () => {
    expect(computeVerificationTier(['did:plc:trusted-a'], ['did:plc:trusted-a'])).toBe('silver');
  });
});

describe('VerificationBadge', () => {
  it('renders nothing when nobody has verified the subject', () => {
    const { queryByTestId } = render(<VerificationBadge subjectDid="did:plc:alice" />);
    expect(queryByTestId('icon-checkmark.seal.fill')).toBeNull();
  });

  it('renders nothing when the master toggle is off, even with verifications', () => {
    mockUseVerificationSettings.mockReturnValue({
      badgesEnabled: false,
      trustedVerifierDids: [],
    });
    mockUseVerifiersForDid.mockReturnValue({ data: ['did:plc:rando'] });
    const { queryByTestId } = render(<VerificationBadge subjectDid="did:plc:alice" />);
    expect(queryByTestId('icon-checkmark.seal.fill')).toBeNull();
  });

  it('renders a blue badge when verified by someone outside the trusted list', () => {
    mockUseVerifiersForDid.mockReturnValue({ data: ['did:plc:rando'] });
    const { getByTestId } = render(<VerificationBadge subjectDid="did:plc:alice" />);
    expect(getByTestId('icon-checkmark.seal.fill').props.children).toMatch(/#0085ff$/i);
  });

  it('renders a silver badge when some (but not all) trusted verifiers vouched', () => {
    mockUseVerifiersForDid.mockReturnValue({
      data: ['did:plc:trusted-a', 'did:plc:rando'],
    });
    mockUseVerificationSettings.mockReturnValue({
      badgesEnabled: true,
      trustedVerifierDids: ['did:plc:trusted-a', 'did:plc:trusted-b'],
    });
    const { getByTestId } = render(<VerificationBadge subjectDid="did:plc:alice" />);
    expect(getByTestId('icon-checkmark.seal.fill').props.children).toMatch(/#C0C0C0$/i);
  });

  it('renders a gold badge when every trusted verifier vouched', () => {
    mockUseVerifiersForDid.mockReturnValue({
      data: ['did:plc:trusted-a', 'did:plc:trusted-b'],
    });
    mockUseVerificationSettings.mockReturnValue({
      badgesEnabled: true,
      trustedVerifierDids: ['did:plc:trusted-a', 'did:plc:trusted-b'],
    });
    const { getByTestId } = render(<VerificationBadge subjectDid="did:plc:alice" />);
    expect(getByTestId('icon-checkmark.seal.fill').props.children).toMatch(/#FFC629$/i);
  });

  it('falls back to appview verification.verifications when Constellation has no data yet', () => {
    mockUseVerifiersForDid.mockReturnValue({ data: undefined });
    const { getByTestId } = render(
      <VerificationBadge subjectDid="did:plc:alice" verification={validVerification} />,
    );
    expect(getByTestId('icon-checkmark.seal.fill')).toBeTruthy();
  });

  it('opens the verifiers sheet when tapped', () => {
    mockUseVerifiersForDid.mockReturnValue({ data: ['did:plc:rando'] });
    const { getByRole, getByTestId } = render(
      <VerificationBadge subjectDid="did:plc:alice" subjectHandle="alice.test" />,
    );
    fireEvent.press(getByRole('button'));
    expect(getByTestId('verifiers-sheet-open')).toBeTruthy();
  });

  it('renders non-interactive when interactive=false', () => {
    mockUseVerifiersForDid.mockReturnValue({ data: ['did:plc:rando'] });
    const { queryByRole, getByTestId } = render(
      <VerificationBadge subjectDid="did:plc:alice" interactive={false} />,
    );
    expect(queryByRole('button')).toBeNull();
    expect(getByTestId('icon-checkmark.seal.fill')).toBeTruthy();
  });
});
