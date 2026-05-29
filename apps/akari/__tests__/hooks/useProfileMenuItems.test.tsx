import { renderHook, act } from '@testing-library/react-native';

import { searchProfilePosts } from '@/components/profile/profileActions';
import { useToast } from '@/contexts/ToastContext';
import { useBlockUser } from '@/hooks/mutations/useBlockUser';
import { useMuteUser } from '@/hooks/mutations/useMuteUser';
import { useConfirm } from '@/hooks/useConfirm';
import { useProfileMenuItems } from '@/hooks/useProfileMenuItems';
import { useRequireAuth } from '@/hooks/useRequireAuth';

import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

jest.mock('@/components/profile/profileActions', () => ({
  searchProfilePosts: jest.fn(),
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: jest.fn(),
}));

jest.mock('@/hooks/mutations/useBlockUser', () => ({
  useBlockUser: jest.fn(),
}));

jest.mock('@/hooks/mutations/useMuteUser', () => ({
  useMuteUser: jest.fn(),
}));

jest.mock('@/hooks/useConfirm', () => ({
  useConfirm: jest.fn(),
}));

jest.mock('@/hooks/useRequireAuth', () => ({
  useRequireAuth: jest.fn(),
}));

jest.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const mockShowToast = jest.fn();
const mockConfirm = jest.fn();
const mockPromptSignIn = jest.fn();
const mockBlockMutateAsync = jest.fn();
const mockMuteMutate = jest.fn();

function setup(args: Parameters<typeof useProfileMenuItems>[0]) {
  return renderHook(() => useProfileMenuItems(args));
}

const baseProfile = {
  did: 'did:plc:alice',
  handle: 'alice.test',
  viewer: {},
} as unknown as NonNullable<Parameters<typeof useProfileMenuItems>[0]['profile']>;

beforeEach(() => {
  jest.clearAllMocks();
  (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  (useConfirm as jest.Mock).mockReturnValue(mockConfirm);
  (useRequireAuth as jest.Mock).mockReturnValue({
    isGuest: false,
    promptSignIn: mockPromptSignIn,
  });
  (useBlockUser as jest.Mock).mockReturnValue({ mutateAsync: mockBlockMutateAsync });
  (useMuteUser as jest.Mock).mockReturnValue({ mutate: mockMuteMutate });
  mockBlockMutateAsync.mockResolvedValue(undefined);
});

describe('useProfileMenuItems', () => {
  it('returns only search + copy link for the user\'s own profile', () => {
    const { result } = setup({
      profile: baseProfile,
      isOwnProfile: true,
      onOpenReportSheet: jest.fn(),
      onOpenListPicker: jest.fn(),
    });

    expect(result.current.map((i) => i.key)).toEqual(['search', 'copyLink']);
  });

  it('returns the full menu for another profile', () => {
    const { result } = setup({
      profile: baseProfile,
      isOwnProfile: false,
      onOpenReportSheet: jest.fn(),
      onOpenListPicker: jest.fn(),
    });

    expect(result.current.map((i) => i.key)).toEqual([
      'copyLink',
      'search',
      'addToLists',
      'mute',
      'block',
      'report',
    ]);
  });

  it('appends a "message on Germ" row when the callback is provided', () => {
    const onMessageOnGerm = jest.fn();
    const { result } = setup({
      profile: baseProfile,
      isOwnProfile: false,
      onOpenReportSheet: jest.fn(),
      onOpenListPicker: jest.fn(),
      onMessageOnGerm,
    });

    const germItem = result.current.find((i) => i.key === 'messageOnGerm');
    expect(germItem).toBeDefined();

    act(() => {
      germItem?.onPress?.();
    });
    expect(onMessageOnGerm).toHaveBeenCalled();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('light');
  });

  it('shows "unmute"/"unblock" labels when already muted/blocked', () => {
    const blockedMuted = {
      ...baseProfile,
      viewer: { blocking: 'at://block', muted: true },
    } as typeof baseProfile;

    const { result } = setup({
      profile: blockedMuted,
      isOwnProfile: false,
      onOpenReportSheet: jest.fn(),
      onOpenListPicker: jest.fn(),
    });

    expect(result.current.find((i) => i.key === 'mute')?.label).toBe('common.unmute');
    expect(result.current.find((i) => i.key === 'block')?.label).toBe('common.unblock');
  });

  it('copies the profile link and toasts success', async () => {
    (Clipboard.setStringAsync as jest.Mock).mockResolvedValueOnce(undefined);
    const { result } = setup({
      profile: baseProfile,
      isOwnProfile: false,
      onOpenReportSheet: jest.fn(),
      onOpenListPicker: jest.fn(),
    });

    const copy = result.current.find((i) => i.key === 'copyLink');
    await act(async () => {
      await copy?.onPress?.();
    });

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith(
      'https://bsky.app/profile/alice.test',
    );
    expect(mockShowToast).toHaveBeenCalledWith({
      message: 'profile.linkCopied',
      type: 'success',
    });
  });

  it('confirms an error when the clipboard write throws', async () => {
    (Clipboard.setStringAsync as jest.Mock).mockRejectedValueOnce(new Error('clipboard'));
    const { result } = setup({
      profile: baseProfile,
      isOwnProfile: false,
      onOpenReportSheet: jest.fn(),
      onOpenListPicker: jest.fn(),
    });

    const copy = result.current.find((i) => i.key === 'copyLink');
    await act(async () => {
      await copy?.onPress?.();
    });

    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'profile.linkCopyError' }),
    );
  });

  it('confirms before copying when there is no handle', async () => {
    const noHandle = { ...baseProfile, handle: undefined } as unknown as typeof baseProfile;
    const { result } = setup({
      profile: noHandle,
      isOwnProfile: false,
      onOpenReportSheet: jest.fn(),
      onOpenListPicker: jest.fn(),
    });

    const copy = result.current.find((i) => i.key === 'copyLink');
    await act(async () => {
      await copy?.onPress?.();
    });

    expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
    expect(mockConfirm).toHaveBeenCalled();
  });

  it('triggers profile post search', () => {
    const { result } = setup({
      profile: baseProfile,
      isOwnProfile: false,
      onOpenReportSheet: jest.fn(),
      onOpenListPicker: jest.fn(),
    });

    act(() => {
      result.current.find((i) => i.key === 'search')?.onPress?.();
    });
    expect(searchProfilePosts).toHaveBeenCalledWith({ handle: 'alice.test' });
  });

  it('opens the list picker from "add to lists"', () => {
    const onOpenListPicker = jest.fn();
    const { result } = setup({
      profile: baseProfile,
      isOwnProfile: false,
      onOpenReportSheet: jest.fn(),
      onOpenListPicker,
    });

    act(() => {
      result.current.find((i) => i.key === 'addToLists')?.onPress?.();
    });
    expect(onOpenListPicker).toHaveBeenCalled();
  });

  it('opens the report sheet for an authenticated user', () => {
    const onOpenReportSheet = jest.fn();
    const { result } = setup({
      profile: baseProfile,
      isOwnProfile: false,
      onOpenReportSheet,
      onOpenListPicker: jest.fn(),
    });

    act(() => {
      result.current.find((i) => i.key === 'report')?.onPress?.();
    });
    expect(onOpenReportSheet).toHaveBeenCalled();
    expect(Haptics.impactAsync).toHaveBeenCalledWith('medium');
  });

  it('prompts sign-in instead of mutating for a guest', () => {
    (useRequireAuth as jest.Mock).mockReturnValue({
      isGuest: true,
      promptSignIn: mockPromptSignIn,
    });
    const onOpenReportSheet = jest.fn();

    const { result } = setup({
      profile: baseProfile,
      isOwnProfile: false,
      onOpenReportSheet,
      onOpenListPicker: jest.fn(),
    });

    act(() => {
      result.current.find((i) => i.key === 'block')?.onPress?.();
    });
    act(() => {
      result.current.find((i) => i.key === 'mute')?.onPress?.();
    });
    act(() => {
      result.current.find((i) => i.key === 'report')?.onPress?.();
    });

    expect(mockPromptSignIn).toHaveBeenCalledTimes(3);
    expect(mockConfirm).not.toHaveBeenCalled();
    expect(onOpenReportSheet).not.toHaveBeenCalled();
  });

  it('confirms then blocks when the destructive button is pressed', async () => {
    const { result } = setup({
      profile: baseProfile,
      isOwnProfile: false,
      onOpenReportSheet: jest.fn(),
      onOpenListPicker: jest.fn(),
    });

    act(() => {
      result.current.find((i) => i.key === 'block')?.onPress?.();
    });

    expect(mockConfirm).toHaveBeenCalledTimes(1);
    const confirmArgs = mockConfirm.mock.calls[0][0];
    const destructiveButton = confirmArgs.buttons.find(
      (b: { style?: string }) => b.style === 'destructive',
    );

    await act(async () => {
      await destructiveButton.onPress();
    });

    expect(mockBlockMutateAsync).toHaveBeenCalledWith({
      did: 'did:plc:alice',
      action: 'block',
    });
  });

  it('unblocks (passing the existing block uri) when already blocking', async () => {
    const blocked = {
      ...baseProfile,
      viewer: { blocking: 'at://existing-block' },
    } as typeof baseProfile;

    const { result } = setup({
      profile: blocked,
      isOwnProfile: false,
      onOpenReportSheet: jest.fn(),
      onOpenListPicker: jest.fn(),
    });

    act(() => {
      result.current.find((i) => i.key === 'block')?.onPress?.();
    });
    const destructiveButton = mockConfirm.mock.calls[0][0].buttons.find(
      (b: { style?: string }) => b.style === 'destructive',
    );

    await act(async () => {
      await destructiveButton.onPress();
    });

    expect(mockBlockMutateAsync).toHaveBeenCalledWith({
      did: 'did:plc:alice',
      blockUri: 'at://existing-block',
      action: 'unblock',
    });
  });

  it('toasts an error when the block mutation throws', async () => {
    mockBlockMutateAsync.mockRejectedValueOnce(new Error('nope'));
    const { result } = setup({
      profile: baseProfile,
      isOwnProfile: false,
      onOpenReportSheet: jest.fn(),
      onOpenListPicker: jest.fn(),
    });

    act(() => {
      result.current.find((i) => i.key === 'block')?.onPress?.();
    });
    const destructiveButton = mockConfirm.mock.calls[0][0].buttons.find(
      (b: { style?: string }) => b.style === 'destructive',
    );

    await act(async () => {
      await destructiveButton.onPress();
    });

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error' }),
    );
  });

  it('confirms then mutes when the destructive button is pressed', () => {
    const { result } = setup({
      profile: baseProfile,
      isOwnProfile: false,
      onOpenReportSheet: jest.fn(),
      onOpenListPicker: jest.fn(),
    });

    act(() => {
      result.current.find((i) => i.key === 'mute')?.onPress?.();
    });
    const destructiveButton = mockConfirm.mock.calls[0][0].buttons.find(
      (b: { style?: string }) => b.style === 'destructive',
    );

    act(() => {
      destructiveButton.onPress();
    });

    expect(mockMuteMutate).toHaveBeenCalledWith({
      actor: 'did:plc:alice',
      action: 'mute',
    });
  });
});
