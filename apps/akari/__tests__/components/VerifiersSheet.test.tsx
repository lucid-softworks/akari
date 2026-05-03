import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import type { BlueskyVerification } from '@/bluesky-api';
import { VerifiersSheet } from '@/components/VerifiersSheet';

const mockNavigate = jest.fn();
const mockUseProfile = jest.fn();

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string, params?: Record<string, string>) => (params ? `${key}:${JSON.stringify(params)}` : key) }),
}));
jest.mock('@/hooks/useBorderColor', () => ({ useBorderColor: () => '#ccc' }));
jest.mock('@/hooks/useThemeColor', () => ({ useThemeColor: () => '#000' }));
jest.mock('@/hooks/queries/useProfile', () => ({
  useProfile: (...args: unknown[]) => mockUseProfile(...args),
}));
jest.mock('@/utils/navigation', () => ({
  useNavigateToProfile: () => mockNavigate,
}));
jest.mock('@/utils/timeUtils', () => ({
  formatRelativeTime: () => 'just now',
}));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('@/components/ui/IconSymbol', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    IconSymbol: ({ name }: { name: string }) => <Text>{name}</Text>,
  };
});
jest.mock('@/components/ui/VirtualizedList', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    VirtualizedList: ({ data, renderItem, keyExtractor }: any) => (
      <View>
        {data.map((item: any, index: number) => (
          <View key={keyExtractor(item, index)}>{renderItem({ item })}</View>
        ))}
      </View>
    ),
  };
});

const verification: BlueskyVerification = {
  verifiedStatus: 'valid',
  trustedVerifierStatus: 'none',
  verifications: [
    { issuer: 'did:plc:bsky-mod', uri: 'at://bsky-mod/app.bsky.graph.verification/1', isValid: true, createdAt: '2025-04-01T00:00:00Z' },
    { issuer: 'did:plc:expired', uri: 'at://expired/app.bsky.graph.verification/2', isValid: false, createdAt: '2025-01-01T00:00:00Z' },
  ],
};

beforeEach(() => {
  mockNavigate.mockReset();
  mockUseProfile.mockReset();
  mockUseProfile.mockReturnValue({
    data: { handle: 'verifier.bsky.app', displayName: 'Bluesky Verifier', avatar: undefined },
    isLoading: false,
  });
});

describe('VerifiersSheet', () => {
  it('filters out invalid verifiers', () => {
    const { queryByText } = render(
      <VerifiersSheet visible onClose={() => undefined} verification={verification} subjectHandle="alice" />,
    );
    expect(queryByText('Bluesky Verifier')).not.toBeNull();
    // The expired verifier (isValid=false) should not produce a profile lookup row
    expect(mockUseProfile).toHaveBeenCalledTimes(1);
    expect(mockUseProfile).toHaveBeenCalledWith('did:plc:bsky-mod');
  });

  it('navigates to verifier profile and closes when tapped', () => {
    const onClose = jest.fn();
    const { getAllByRole } = render(
      <VerifiersSheet visible onClose={onClose} verification={verification} subjectHandle="alice" />,
    );
    // First button is the "Done" header button; verifier rows come after
    const buttons = getAllByRole('button');
    fireEvent.press(buttons[1]);
    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ actor: 'verifier.bsky.app' });
  });

  it('shows the empty state when no verifiers are valid', () => {
    const noneVerification: BlueskyVerification = {
      verifiedStatus: 'valid',
      trustedVerifierStatus: 'none',
      verifications: [],
    };
    const { getByText } = render(
      <VerifiersSheet visible onClose={() => undefined} verification={noneVerification} subjectHandle="alice" />,
    );
    expect(getByText('ui.noVerifiers')).toBeTruthy();
  });

  it('uses the trusted-verifier intro copy when trustedVerifierStatus is valid', () => {
    const trusted: BlueskyVerification = {
      verifiedStatus: 'none',
      trustedVerifierStatus: 'valid',
      verifications: [],
    };
    const { getByText } = render(
      <VerifiersSheet visible onClose={() => undefined} verification={trusted} subjectHandle="nyt.com" subjectDisplayName="The New York Times" />,
    );
    expect(getByText(/ui\.trustedVerifierSheetIntroTitle/)).toBeTruthy();
    expect(getByText('ui.trustedVerifierSheetIntroBody')).toBeTruthy();
  });
});
