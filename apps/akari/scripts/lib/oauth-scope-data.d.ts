export type RepoAction = 'create' | 'update' | 'delete';

export type OAuthFlatScope = {
  id: string;
  /** Optional list of literal scope tokens this row maps to. When
   *  omitted, the scope token is just `id`. Used to group large families
   *  of `rpc:*` per-procedure scopes under one picker row. */
  tokens?: string[];
  required: boolean;
  defaultEnabled: boolean;
  labelKey: string;
  descriptionKey: string;
};

export type OAuthRepoScope = {
  collection: string;
  actions: RepoAction[];
  defaultActions: RepoAction[];
  requiredActions?: RepoAction[];
  labelKey: string;
  descriptionKey: string;
};

export const flatScopes: OAuthFlatScope[];
export const repoScopes: OAuthRepoScope[];
export function buildFullScopeString(): string;
