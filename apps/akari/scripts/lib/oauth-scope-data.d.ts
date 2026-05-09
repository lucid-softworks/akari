export type RepoAction = 'create' | 'update' | 'delete';

export type OAuthFlatScope = {
  id: string;
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
