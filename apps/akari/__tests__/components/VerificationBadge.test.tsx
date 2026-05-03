import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import type { BlueskyVerification } from '@/bluesky-api';
import { VerificationBadge, isVerified } from '@/components/VerificationBadge';

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
jest.mock('@/components/ui/IconSymbol', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    IconSymbol: ({ name }: { name: string }) => <Text testID={`icon-${name}`}>{name}</Text>,
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

const validVerification: BlueskyVerification = {
  verifiedStatus: 'valid',
  trustedVerifierStatus: 'none',
  verifications: [
    { issuer: 'did:plc:verifier', uri: 'at://verifier/app.bsky.graph.verification/1', isValid: true, createdAt: '2025-04-01T00:00:00Z' },
  ],
};

const invalidVerification: BlueskyVerification = {
  verifiedStatus: 'invalid',
  trustedVerifierStatus: 'none',
  verifications: [],
};

describe('isVerified', () => {
  it('returns false when verification is undefined', () => {
    expect(isVerified(undefined)).toBe(false);
  });

  it('returns false when both statuses are not "valid"', () => {
    expect(isVerified(invalidVerification)).toBe(false);
    expect(
      isVerified({ verifiedStatus: 'none', trustedVerifierStatus: 'none', verifications: [] }),
    ).toBe(false);
  });

  it('returns true when verifiedStatus is "valid"', () => {
    expect(isVerified(validVerification)).toBe(true);
  });

  it('returns true when trustedVerifierStatus is "valid"', () => {
    expect(
      isVerified({
        verifiedStatus: 'none',
        trustedVerifierStatus: 'valid',
        verifications: [],
      }),
    ).toBe(true);
  });
});

describe('VerificationBadge', () => {
  it('renders nothing when verification is missing', () => {
    const { queryByTestId } = render(<VerificationBadge />);
    expect(queryByTestId('icon-checkmark.seal.fill')).toBeNull();
  });

  it('renders nothing when verification is invalid', () => {
    const { queryByTestId } = render(<VerificationBadge verification={invalidVerification} />);
    expect(queryByTestId('icon-checkmark.seal.fill')).toBeNull();
  });

  it('renders the seal icon when verification is valid', () => {
    const { getByTestId } = render(<VerificationBadge verification={validVerification} />);
    expect(getByTestId('icon-checkmark.seal.fill')).toBeTruthy();
  });

  it('opens the verifiers sheet when tapped', () => {
    const { getByRole, getByTestId } = render(
      <VerificationBadge verification={validVerification} subjectHandle="alice.test" />,
    );
    fireEvent.press(getByRole('button'));
    expect(getByTestId('verifiers-sheet-open')).toBeTruthy();
  });

  it('renders non-interactive when interactive=false', () => {
    const { queryByRole, getByTestId } = render(
      <VerificationBadge verification={validVerification} interactive={false} />,
    );
    expect(queryByRole('button')).toBeNull();
    expect(getByTestId('icon-checkmark.seal.fill')).toBeTruthy();
  });

  it('uses the trusted-verifier label when trustedVerifierStatus is "valid"', () => {
    const trusted: BlueskyVerification = {
      verifiedStatus: 'none',
      trustedVerifierStatus: 'valid',
      verifications: [],
    };
    const { getByLabelText } = render(<VerificationBadge verification={trusted} />);
    expect(getByLabelText('ui.trustedVerifierBadge')).toBeTruthy();
  });
});
