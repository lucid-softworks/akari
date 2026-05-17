export type WebPlayerStatus = 'idle' | 'loading' | 'readyToPlay' | 'error';

export type WebPlayerState = {
  playerStatus: WebPlayerStatus;
  playerError: string | null;
  shouldShowVideo: boolean;
  playbackUrl: string | null;
  isResolvingUrl: boolean;
};

export type WebPlayerAction =
  | { type: 'press' }
  | { type: 'resolveCleared' }
  | { type: 'resolveSettled'; playbackUrl: string | null }
  | { type: 'resolveStart' }
  | { type: 'initStart' }
  | { type: 'loaded' }
  | { type: 'error'; message: string }
  | { type: 'reset' };

export const INITIAL_WEB_PLAYER_STATE: WebPlayerState = {
  playerStatus: 'idle',
  playerError: null,
  shouldShowVideo: false,
  playbackUrl: null,
  isResolvingUrl: false,
};

export function webPlayerReducer(state: WebPlayerState, action: WebPlayerAction): WebPlayerState {
  switch (action.type) {
    case 'press':
      return { ...state, shouldShowVideo: true, playerStatus: 'loading', playerError: null };
    case 'resolveCleared':
      return { ...state, playbackUrl: null };
    case 'resolveSettled':
      return { ...state, playbackUrl: action.playbackUrl, isResolvingUrl: false };
    case 'resolveStart':
      return { ...state, isResolvingUrl: true };
    case 'initStart':
      return { ...state, playerStatus: 'loading', playerError: null };
    case 'loaded':
      return { ...state, playerStatus: 'readyToPlay' };
    case 'error':
      return { ...state, playerStatus: 'error', playerError: action.message };
    case 'reset':
      return INITIAL_WEB_PLAYER_STATE;
  }
}
