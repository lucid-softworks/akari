export type Account = {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  jwtToken: string;
  refreshToken: string;
  pdsUrl?: string;
  active?: boolean;
  status?: 'takendown' | 'suspended' | 'deactivated';
  email?: string;
  emailConfirmed?: boolean;
  emailAuthFactor?: boolean;
};
