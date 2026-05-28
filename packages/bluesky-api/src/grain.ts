import { BlueskyApiClient } from './client';

/**
 * Minimal client for the `social.grain.*` lexicons (grain.social — photo
 * galleries on AT Protocol). We only implement the read paths the
 * Photos profile tab needs: list a user's galleries, list a user's
 * photos, list gallery items so we can build a cover image and
 * resolve a gallery's contents.
 *
 * Source lexicons live at github.com/grainsocial/grain under
 * `lexicons/social/grain/`. Photo blobs live on the user's PDS and
 * are fetched via `com.atproto.sync.getBlob` — grain runs its own
 * AppView CDN as well, but we stay PDS-direct so the tab works
 * without depending on a third-party host.
 */

export type GrainAspectRatio = {
  width: number;
  height: number;
};

export type GrainPhotoRecord = {
  uri: string;
  cid: string;
  value: {
    $type: 'social.grain.photo';
    photo: {
      $type: 'blob';
      ref: { $link: string };
      mimeType: string;
      size: number;
    };
    alt?: string;
    aspectRatio: GrainAspectRatio;
    createdAt: string;
  };
};

export type GrainGalleryRecord = {
  uri: string;
  cid: string;
  value: {
    $type: 'social.grain.gallery';
    title: string;
    description?: string;
    facets?: unknown[];
    labels?: unknown;
    location?: unknown;
    address?: unknown;
    createdAt: string;
    updatedAt?: string;
  };
};

export type GrainGalleryItemRecord = {
  uri: string;
  cid: string;
  value: {
    $type: 'social.grain.gallery.item';
    gallery: string;
    item: string;
    position?: number;
    createdAt: string;
  };
};

/**
 * EXIF sidecar for a `social.grain.photo`. Numeric fields are scaled by
 * 1,000,000 on the wire (grain stores integers to keep room for decimal
 * precision); divide by 1e6 before display. `photo` is the at:// URI of
 * the photo record this metadata belongs to.
 */
export type GrainPhotoExifRecord = {
  uri: string;
  cid: string;
  value: {
    $type: 'social.grain.photo.exif';
    photo: string;
    createdAt: string;
    dateTimeOriginal?: string;
    exposureTime?: number;
    fNumber?: number;
    flash?: string;
    focalLengthIn35mmFormat?: number;
    iSO?: number;
    lensMake?: string;
    lensModel?: string;
    make?: string;
    model?: string;
  };
};

export type GrainGalleryRecordsResponse = {
  records: GrainGalleryRecord[];
  cursor?: string;
};

export type GrainPhotoRecordsResponse = {
  records: GrainPhotoRecord[];
  cursor?: string;
};

export type GrainGalleryItemRecordsResponse = {
  records: GrainGalleryItemRecord[];
  cursor?: string;
};

export type GrainPhotoExifRecordsResponse = {
  records: GrainPhotoExifRecord[];
  cursor?: string;
};

export class BlueskyGrain extends BlueskyApiClient {
  /**
   * Lists `social.grain.gallery` records on the actor's repo. Returns
   * empty when the actor doesn't use grain.social.
   */
  async getActorGalleries(
    accessJwt: string,
    repo: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<GrainGalleryRecordsResponse> {
    const params: Record<string, string> = {
      repo,
      collection: 'social.grain.gallery',
      limit: limit.toString(),
    };
    if (cursor) params.cursor = cursor;

    try {
      return await this.makeAuthenticatedRequest<GrainGalleryRecordsResponse>(
        '/com.atproto.repo.listRecords',
        accessJwt,
        { params },
      );
    } catch {
      return { records: [], cursor: undefined };
    }
  }

  /**
   * Lists `social.grain.photo` records on the actor's repo. Each record
   * carries a single image blob; URLs are built separately via
   * {@link buildGrainPhotoBlobUrl}.
   */
  async getActorPhotos(
    accessJwt: string,
    repo: string,
    limit: number = 50,
    cursor?: string,
  ): Promise<GrainPhotoRecordsResponse> {
    const params: Record<string, string> = {
      repo,
      collection: 'social.grain.photo',
      limit: limit.toString(),
    };
    if (cursor) params.cursor = cursor;

    try {
      return await this.makeAuthenticatedRequest<GrainPhotoRecordsResponse>(
        '/com.atproto.repo.listRecords',
        accessJwt,
        { params },
      );
    } catch {
      return { records: [], cursor: undefined };
    }
  }

  /**
   * Lists `social.grain.gallery.item` membership records. These tie a
   * photo URI to a gallery URI with an ordering position. Used to find
   * the cover photo for a gallery and to resolve a gallery's contents.
   */
  async getActorGalleryItems(
    accessJwt: string,
    repo: string,
    limit: number = 100,
    cursor?: string,
  ): Promise<GrainGalleryItemRecordsResponse> {
    const params: Record<string, string> = {
      repo,
      collection: 'social.grain.gallery.item',
      limit: limit.toString(),
    };
    if (cursor) params.cursor = cursor;

    try {
      return await this.makeAuthenticatedRequest<GrainGalleryItemRecordsResponse>(
        '/com.atproto.repo.listRecords',
        accessJwt,
        { params },
      );
    } catch {
      return { records: [], cursor: undefined };
    }
  }

  /**
   * Lists `social.grain.photo.exif` sidecar records — camera / lens /
   * exposure metadata that grain extracts on upload (Bluesky strips EXIF,
   * grain keeps it in this separate record). Each links to its photo via
   * `value.photo`. Returns empty for actors that don't use grain.
   */
  async getActorPhotoExif(
    accessJwt: string,
    repo: string,
    limit: number = 100,
    cursor?: string,
  ): Promise<GrainPhotoExifRecordsResponse> {
    const params: Record<string, string> = {
      repo,
      collection: 'social.grain.photo.exif',
      limit: limit.toString(),
    };
    if (cursor) params.cursor = cursor;

    try {
      return await this.makeAuthenticatedRequest<GrainPhotoExifRecordsResponse>(
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
 * Builds a PDS-direct blob URL for a grain photo. The grain AppView
 * runs its own CDN for hydrated views, but for tier-1 we stay
 * dependency-free and stream the blob straight off the user's PDS.
 * Blobs are capped at 1MB by the lexicon so this is reasonable.
 */
export function buildGrainPhotoBlobUrl(
  pdsUrl: string,
  did: string,
  cid: string,
): string {
  return `${pdsUrl}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}
