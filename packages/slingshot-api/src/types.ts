/**
 * Generic atproto record envelope returned by `com.atproto.repo.getRecord`.
 * `value` is the raw lexicon record body and stays unknown — callers narrow
 * via a generic type parameter on `SlingshotApi#getRecord`.
 */
export type SlingshotRecordResponse<T = unknown> = {
  uri: string;
  cid: string;
  value: T;
};

export type SlingshotGetRecordQuery = {
  repo: string;
  collection: string;
  rkey: string;
};

export type SlingshotResolveHandleResponse = {
  did: string;
};
