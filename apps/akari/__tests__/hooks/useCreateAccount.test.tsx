import { renderHook, act, waitFor } from '@testing-library/react-native';

import { useAddAccount } from '@/hooks/mutations/useAddAccount';
import { useCreateAccount as useCreateAccountMutation } from '@/hooks/mutations/useCreateAccount';
import { useSwitchAccount } from '@/hooks/mutations/useSwitchAccount';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useConfirm } from '@/hooks/useConfirm';
import { useCreateAccount, type CreateAccountInput } from '@/hooks/useCreateAccount';

jest.mock('@/hooks/mutations/useAddAccount', () => ({ useAddAccount: jest.fn() }));
jest.mock('@/hooks/mutations/useCreateAccount', () => ({ useCreateAccount: jest.fn() }));
jest.mock('@/hooks/mutations/useSwitchAccount', () => ({ useSwitchAccount: jest.fn() }));
jest.mock('@/hooks/queries/useCurrentAccount', () => ({ useCurrentAccount: jest.fn() }));
jest.mock('@/hooks/useConfirm', () => ({ useConfirm: jest.fn() }));
jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockConfirm = jest.fn();
const mockCreateMutateAsync = jest.fn();
const mockAddMutateAsync = jest.fn();
const mockSwitchMutateAsync = jest.fn();

const validBskyInput: CreateAccountInput = {
  provider: 'bsky',
  email: 'alice@example.com',
  password: 'supersecret',
  handle: 'alice',
  handleSuffix: '.bsky.social',
};

const session = {
  did: 'did:plc:alice',
  handle: 'alice.bsky.social',
  accessJwt: 'access',
  refreshJwt: 'refresh',
  profile: { displayName: 'Alice', avatar: 'https://avatar' },
};

function setup() {
  return renderHook(() => useCreateAccount());
}

beforeEach(() => {
  jest.clearAllMocks();
  (useConfirm as jest.Mock).mockReturnValue(mockConfirm);
  (useCurrentAccount as jest.Mock).mockReturnValue({ data: undefined });
  (useCreateAccountMutation as jest.Mock).mockReturnValue({
    mutateAsync: mockCreateMutateAsync,
    isPending: false,
  });
  (useAddAccount as jest.Mock).mockReturnValue({ mutateAsync: mockAddMutateAsync });
  (useSwitchAccount as jest.Mock).mockReturnValue({ mutateAsync: mockSwitchMutateAsync });

  mockCreateMutateAsync.mockResolvedValue(session);
  mockAddMutateAsync.mockResolvedValue({ did: 'did:plc:alice' });
  mockSwitchMutateAsync.mockResolvedValue(undefined);
});

describe('useCreateAccount', () => {
  it('exposes the loading flag from the create mutation', () => {
    (useCreateAccountMutation as jest.Mock).mockReturnValue({
      mutateAsync: mockCreateMutateAsync,
      isPending: true,
    });
    const { result } = setup();
    expect(result.current.isLoading).toBe(true);
  });

  it('reports whether there is already a current account', () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'x' } });
    const { result } = setup();
    expect(result.current.hasCurrentAccount).toBe(true);
  });

  it('runs the full create -> add -> switch flow and redirects home', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.createAccount(validBskyInput);
    });

    expect(mockCreateMutateAsync).toHaveBeenCalledWith({
      email: 'alice@example.com',
      handle: 'alice.bsky.social',
      password: 'supersecret',
      inviteCode: undefined,
      pdsUrl: 'https://bsky.social',
    });
    expect(mockAddMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        did: 'did:plc:alice',
        handle: 'alice.bsky.social',
        displayName: 'Alice',
        avatar: 'https://avatar',
        jwtToken: 'access',
        refreshToken: 'refresh',
        pdsUrl: 'https://bsky.social',
      }),
    );
    expect(mockSwitchMutateAsync).toHaveBeenCalled();

    await waitFor(() => {
      expect(result.current.redirectAfterAuth).toBe('/');
    });
  });

  it('redirects to settings when adding a second account', async () => {
    (useCurrentAccount as jest.Mock).mockReturnValue({ data: { did: 'existing' } });
    const { result } = setup();

    await act(async () => {
      await result.current.createAccount(validBskyInput);
    });

    await waitFor(() => {
      expect(result.current.redirectAfterAuth).toBe('/(tabs)/settings');
    });
  });

  it('passes a trimmed invite code through to the mutation', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.createAccount({ ...validBskyInput, inviteCode: '  abc-123  ' });
    });

    expect(mockCreateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ inviteCode: 'abc-123' }),
    );
  });

  it('falls back to the handle for displayName when the profile is missing', async () => {
    mockCreateMutateAsync.mockResolvedValueOnce({ ...session, profile: undefined });
    const { result } = setup();

    await act(async () => {
      await result.current.createAccount(validBskyInput);
    });

    expect(mockAddMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ displayName: 'alice.bsky.social', avatar: undefined }),
    );
  });

  it('validates required fields before hitting the network', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.createAccount({ ...validBskyInput, email: '   ' });
    });

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'auth.fillAllFields' }),
    );
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
  });

  it('rejects a malformed email', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.createAccount({ ...validBskyInput, email: 'not-an-email' });
    });

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'auth.signupInvalidEmail' }),
    );
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
  });

  it('rejects a too-short password', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.createAccount({ ...validBskyInput, password: 'short' });
    });

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'auth.signupPasswordTooShort' }),
    );
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
  });

  it('rejects a too-short handle for a preset provider', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.createAccount({ ...validBskyInput, handle: 'ab' });
    });

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'auth.signupHandleTooShort' }),
    );
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
  });

  it('rejects an invalid handle local part for a preset provider', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.createAccount({ ...validBskyInput, handle: 'bad_handle!' });
    });

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'auth.signupHandleInvalid' }),
    );
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
  });

  it('creates an account on a custom PDS with a full handle', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.createAccount({
        provider: 'custom',
        email: 'alice@example.com',
        password: 'supersecret',
        handle: 'me.example.com',
        pdsUrl: 'https://pds.example.com/',
      });
    });

    expect(mockCreateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        handle: 'me.example.com',
        // trailing slash trimmed
        pdsUrl: 'https://pds.example.com',
      }),
    );
  });

  it('rejects an invalid custom PDS url', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.createAccount({
        provider: 'custom',
        email: 'alice@example.com',
        password: 'supersecret',
        handle: 'me.example.com',
        pdsUrl: 'ftp://not-https',
      });
    });

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'auth.signupCustomInvalidPdsUrl' }),
    );
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
  });

  it('rejects an invalid custom full handle', async () => {
    const { result } = setup();

    await act(async () => {
      await result.current.createAccount({
        provider: 'custom',
        email: 'alice@example.com',
        password: 'supersecret',
        handle: 'nodot',
        pdsUrl: 'https://pds.example.com',
      });
    });

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'auth.signupCustomInvalidHandle' }),
    );
    expect(mockCreateMutateAsync).not.toHaveBeenCalled();
  });

  it('surfaces the error message when account creation throws', async () => {
    mockCreateMutateAsync.mockRejectedValueOnce(new Error('PDS rejected handle'));
    const { result } = setup();

    await act(async () => {
      await result.current.createAccount(validBskyInput);
    });

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'PDS rejected handle' }),
    );
    expect(result.current.redirectAfterAuth).toBeNull();
  });

  it('falls back to a generic message for non-Error throws', async () => {
    mockCreateMutateAsync.mockRejectedValueOnce('weird');
    const { result } = setup();

    await act(async () => {
      await result.current.createAccount(validBskyInput);
    });

    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'auth.signupFailedGeneric' }),
    );
  });
});
