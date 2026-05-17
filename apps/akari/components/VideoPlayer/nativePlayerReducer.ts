export type NativePlayerStatus = 'idle' | 'loading' | 'readyToPlay' | 'error';

export type NativePlayerState = {
  playerStatus: NativePlayerStatus;
  playerError: string | null;
  shouldShowVideo: boolean;
  isPlaying: boolean;
  playbackUrl: string | null;
  isResolvingUrl: boolean;
};

export type NativePlayerAction =
  | { type: 'press' }
  | { type: 'resolveCleared' }
  | { type: 'resolveSettled'; playbackUrl: string | null }
  | { type: 'resolveStart' }
  | { type: 'loadStart' }
  | { type: 'loaded' }
  | { type: 'playing' }
  | { type: 'ended' }
  | { type: 'error'; message: string }
  | { type: 'reset' };

export const INITIAL_NATIVE_PLAYER_STATE: NativePlayerState = {
  playerStatus: 'idle',
  playerError: null,
  shouldShowVideo: false,
  isPlaying: false,
  playbackUrl: null,
  isResolvingUrl: false,
};

export function nativePlayerReducer(
  state: NativePlayerState,
  action: NativePlayerAction,
): NativePlayerState {
  switch (action.type) {
    case 'press':
      return { ...state, shouldShowVideo: true, playerStatus: 'loading' };
    case 'resolveCleared':
      return { ...state, playbackUrl: null };
    case 'resolveSettled':
      return { ...state, playbackUrl: action.playbackUrl, isResolvingUrl: false };
    case 'resolveStart':
      return { ...state, isResolvingUrl: true };
    case 'loadStart':
      return { ...state, playerStatus: 'loading', playerError: null };
    case 'loaded':
      return { ...state, playerStatus: 'readyToPlay', playerError: null };
    case 'playing':
      return { ...state, isPlaying: true };
    case 'ended':
      return { ...state, isPlaying: false };
    case 'error':
      return { ...state, playerStatus: 'error', playerError: action.message };
    case 'reset':
      return INITIAL_NATIVE_PLAYER_STATE;
  }
}
