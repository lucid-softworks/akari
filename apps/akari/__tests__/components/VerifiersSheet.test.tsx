import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import type { BlueskyVerification } from '@/bluesky-api';
import { VerifiersSheet } from '@/components/VerifiersSheet';

const mockNavigate = jest.fn();
const mockUseProfile = jest.fn();
const mockUseVerifiersForDid = jest.fn();
const mockAddTrusted = jest.fn();
const mockRemoveTrusted = jest.fn();
let mockTrustedDids: string[] = [];

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));
jest.mock('@/hooks/useBorderColor', () => ({ useBorderColor: () => '#ccc' }));
jest.mock('@/hooks/useThemeColor', () => ({ useThemeColor: () => '#000' }));
jest.mock('@/hooks/queries/useProfile', () => ({
  useProfile: (...args: unknown[]) => mockUseProfile(...args),
}));
jest.mock('@/hooks/queries/useVerifiersForDid', () => ({
  useVerifiersForDid: (...args: unknown[]) => mockUseVerifiersForDid(...args),
}));
jest.mock('@/hooks/useVerificationSettings', () => ({
  useVerificationSettings: () => ({
    trustedVerifierDids: mockTrustedDids,
    isTrustedVerifier: (did: string) => mockTrustedDids.includes(did),
    addTrustedVerifier: mockAddTrusted,
    removeTrustedVerifier: mockRemoveTrusted,
  }),
}));
jest.mock('@/utils/navigation', () => ({
  useNavigateToProfile: () => mockNavigate,
}));
jest.mock('@/utils/timeUtils', () => ({
  formatRelativeTime: () => 'just now',
}));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('@/components/ui/IconSymbol', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  return {
    IconSymbol: ({ name }: { name: string }) => ReactLib.createElement(Text, null, name),
  };
});
jest.mock('@/components/ui/VirtualizedList', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  return {
    VirtualizedList: ({ data, renderItem, keyExtractor }: any) =>
      ReactLib.createElement(
        View,
        null,
        data.map((item: any, index: number) =>
          ReactLib.createElement(View, { key: keyExtractor(item, index) }, renderItem({ item })),
        ),
      ),
  };
});

const verification: BlueskyVerification = {
  verifiedStatus: 'valid',
  trustedVerifierStatus: 'none',
  verifications: [
    {
      issuer: 'did:plc:appview',
      uri: 'at://appview/app.bsky.graph.verification/1',
      isValid: true,
      createdAt: '2025-04-01T00:00:00Z',
    },
  ],
};

beforeEach(() => {
  mockNavigate.mockReset();
  mockUseProfile.mockReset();
  mockAddTrusted.mockReset();
  mockRemoveTrusted.mockReset();
  mockTrustedDids = [];
  mockUseVerifiersForDid.mockReturnValue({ data: [] });
  mockUseProfile.mockImplementation((did: string) => ({
    data: { handle: `${did.split(':').pop()}.test`, displayName: `User ${did}`, avatar: undefined },
    isLoading: false,
  }));
});

describe('VerifiersSheet', () => {
  it('renders rows from the appview verifications', () => {
    const { queryByText } = render(
      <VerifiersSheet
        visible
        onClose={() => undefined}
        subjectDid="did:plc:alice"
        verification={verification}
        subjectHandle="alice"
      />,
    );
    expect(queryByText('User did:plc:appview')).not.toBeNull();
  });

  it('merges Constellation DIDs that are not in the appview list', () => {
    mockUseVerifiersForDid.mockReturnValue({
      data: ['did:plc:appview', 'did:plc:thirdparty'],
    });
    const { queryByText } = render(
      <VerifiersSheet
        visible
        onClose={() => undefined}
        subjectDid="did:plc:alice"
        verification={verification}
        subjectHandle="alice"
      />,
    );
    expect(queryByText('User did:plc:appview')).not.toBeNull();
    expect(queryByText('User did:plc:thirdparty')).not.toBeNull();
  });

  it('groups trusted verifiers above other verifiers with section headers', () => {
    mockTrustedDids = ['did:plc:appview'];
    mockUseVerifiersForDid.mockReturnValue({
      data: ['did:plc:appview', 'did:plc:thirdparty'],
    });
    const { getByText } = render(
      <VerifiersSheet
        visible
        onClose={() => undefined}
        subjectDid="did:plc:alice"
        verification={verification}
        subjectHandle="alice"
      />,
    );
    // Section header keys uppercased; the t() mock returns keys verbatim.
    expect(getByText('UI.VERIFIERSTRUSTEDHEADER')).toBeTruthy();
    expect(getByText('UI.VERIFIERSOTHERHEADER')).toBeTruthy();
  });

  it('navigates to verifier profile and closes when the row is tapped', () => {
    const onClose = jest.fn();
    const { getAllByRole } = render(
      <VerifiersSheet
        visible
        onClose={onClose}
        subjectDid="did:plc:alice"
        verification={verification}
        subjectHandle="alice"
      />,
    );
    // Buttons are: [0] Done header, [1] row main, [2] trust toggle
    const buttons = getAllByRole('button');
    fireEvent.press(buttons[1]);
    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith({ actor: 'appview.test' });
  });

  it('promotes a verifier into the trusted list when the trust toggle is tapped', () => {
    const { getAllByRole } = render(
      <VerifiersSheet
        visible
        onClose={() => undefined}
        subjectDid="did:plc:alice"
        verification={verification}
        subjectHandle="alice"
      />,
    );
    const buttons = getAllByRole('button');
    // [0] Done, [1] row main, [2] trust toggle
    fireEvent.press(buttons[2]);
    expect(mockAddTrusted).toHaveBeenCalledWith('did:plc:appview');
    expect(mockRemoveTrusted).not.toHaveBeenCalled();
  });

  it('demotes a verifier when the trust toggle is tapped on an already-trusted row', () => {
    mockTrustedDids = ['did:plc:appview'];
    const { getAllByRole } = render(
      <VerifiersSheet
        visible
        onClose={() => undefined}
        subjectDid="did:plc:alice"
        verification={verification}
        subjectHandle="alice"
      />,
    );
    const buttons = getAllByRole('button');
    fireEvent.press(buttons[2]);
    expect(mockRemoveTrusted).toHaveBeenCalledWith('did:plc:appview');
    expect(mockAddTrusted).not.toHaveBeenCalled();
  });

  it('shows the empty state when there are no verifiers anywhere', () => {
    const noneVerification: BlueskyVerification = {
      verifiedStatus: 'valid',
      trustedVerifierStatus: 'none',
      verifications: [],
    };
    const { getByText } = render(
      <VerifiersSheet
        visible
        onClose={() => undefined}
        subjectDid="did:plc:alice"
        verification={noneVerification}
        subjectHandle="alice"
      />,
    );
    expect(getByText('ui.noVerifiers')).toBeTruthy();
  });
});
