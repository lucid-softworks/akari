export type Account = {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  jwtToken: string;
  refreshToken: string;
  createdAt: number;
};
