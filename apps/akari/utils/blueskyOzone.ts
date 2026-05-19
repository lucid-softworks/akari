/**
 * Helpers for constructing a `BlueskyOzone` client against the user's PDS.
 *
 * Ozone calls don't go directly to the labeler — they're proxied through
 * the user's PDS via an `atproto-proxy: <ozoneDid>#atproto_labeler`
 * header, which the package adds per request. We just need to point the
 * client at the right PDS and let the per-request proxy headers do the
 * routing.
 */

import { BlueskyOzone } from 'bluesky-ozone';

import type { Account } from '@/types/account';

/**
 * Build a `BlueskyOzone` client rooted at `account.pdsUrl`. The Ozone DID
 * the user wants to talk to is supplied per call, not in the constructor.
 */
export function ozoneForAccount(account: Pick<Account, 'pdsUrl'>): BlueskyOzone {
  if (!account.pdsUrl) {
    throw new Error('ozoneForAccount: account is missing pdsUrl');
  }
  // The second arg here is the AppView proxy DID — irrelevant for Ozone
  // calls because the per-request `atproto-proxy: <ozoneDid>#atproto_labeler`
  // header overrides any AppView routing. Pass `null` to keep the base
  // client from injecting a stray `#bsky_appview` header.
  return new BlueskyOzone(account.pdsUrl, null);
}

/**
 * Settings shape we persist per-account: which Ozone instance to talk to.
 * Defaults to the official Bluesky moderation service when unset.
 */
export const DEFAULT_OZONE_DID = 'did:plc:ar7c4by46qjdydhdevvrndac';
