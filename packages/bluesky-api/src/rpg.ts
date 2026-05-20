import { BlueskyApiClient } from './client';

/**
 * Minimal client for the rpg.actor lexicons. We only implement the
 * read path the Inventory profile tab needs: list a player's
 * `equipment.rpg.item` records on their PDS. The paired
 * `equipment.rpg.give` records live on each provider's PDS and aren't
 * needed for display — `equipment.rpg.item` already carries the
 * `provider` DID, `title`, `description`, `kind`, plus the `icon` and
 * `asset` blobs.
 *
 * Source lexicons live at https://rpg.actor/lexicons/.
 */

export type RpgItemColorChannel = {
  name: string;
  color: string;
  defaultColor?: string;
};

export type RpgItemRecord = {
  uri: string;
  cid: string;
  value: {
    $type: 'equipment.rpg.item';
    item: string;
    /** 'layer' for sprite wearables; any descriptive string otherwise. */
    kind?: string;
    /** Generator layer category for 'layer' items (e.g. 'tops', 'righthand'). */
    category?: string;
    title: string;
    description?: string;
    /** AT URI of the provider's equipment.rpg.give record. */
    give: string;
    /** DID of the provider who gave the item. */
    provider: string;
    /** Sprite-layer artwork (144x192 PNG). Required for 'layer' items. */
    asset?: {
      $type: 'blob';
      ref: { $link: string };
      mimeType: string;
      size: number;
    };
    /** Small standalone icon for inventory displays. */
    icon?: {
      $type: 'blob';
      ref: { $link: string };
      mimeType: string;
      size: number;
    };
    colorway?: {
      $type: 'blob';
      ref: { $link: string };
      mimeType: string;
      size: number;
    };
    channels?: RpgItemColorChannel[];
    behindRows?: number[];
    assetCid?: string;
    stats?: Record<string, unknown>;
    context?: string;
    acceptedAt: string;
  };
};

export type RpgItemRecordsResponse = {
  records: RpgItemRecord[];
  cursor?: string;
};

export class BlueskyRpg extends BlueskyApiClient {
  /**
   * Lists `equipment.rpg.item` records on the actor's repo. Returns
   * empty when the actor doesn't use rpg.actor.
   */
  async getActorInventory(
    accessJwt: string,
    repo: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<RpgItemRecordsResponse> {
    const params: Record<string, string> = {
      repo,
      collection: 'equipment.rpg.item',
      limit: limit.toString(),
    };
    if (cursor) params.cursor = cursor;

    try {
      return await this.makeAuthenticatedRequest<RpgItemRecordsResponse>(
        '/com.atproto.repo.listRecords',
        accessJwt,
        { params },
      );
    } catch {
      return { records: [], cursor: undefined };
    }
  }
}

/**
 * Builds a PDS-direct blob URL for an rpg.actor item's icon/asset.
 * We stay PDS-direct so the tab works without depending on a
 * third-party CDN.
 */
export function buildRpgItemBlobUrl(
  pdsUrl: string,
  did: string,
  cid: string,
): string {
  return `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}

/**
 * Convenience: pick the best image cid to render for an item.
 * - Inventory-style items prefer `icon` (small, intended for displays)
 * - Layer items fall back to `asset` (the full sprite layer)
 */
export function pickRpgItemImageCid(item: RpgItemRecord): string | null {
  const icon = item.value.icon?.ref.$link;
  if (icon) return icon;
  const asset = item.value.asset?.ref.$link;
  if (asset) return asset;
  return null;
}
