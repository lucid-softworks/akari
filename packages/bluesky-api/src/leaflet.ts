import { BlueskyApiClient } from './client';

/**
 * Minimal client for the `pub.leaflet.*` lexicons (Leaflet — long-form
 * documents on AT Protocol). We only implement the two records the
 * composer needs: `pub.leaflet.publication` (the container) and
 * `pub.leaflet.document` (the document itself, page-of-blocks).
 *
 * Source lexicons live at github.com/hyperlink-academy/leaflet under
 * `lexicons/pub/leaflet/`. We don't speak the full block grammar — the
 * body is shipped as a sequence of `pub.leaflet.blocks.text` blocks
 * (one per paragraph), which Leaflet renders as plain prose. Users can
 * add formatting in the Leaflet editor afterwards if they want.
 */

export type LeafletPublicationRecord = {
  uri: string;
  cid: string;
  value: {
    name?: string;
    base_path?: string;
    description?: string;
  };
};

export type CreateLeafletPublicationInput = {
  /** Display name for the publication. Defaults to the user's handle. */
  name: string;
  /** Optional one-line description shown on the publication page. */
  description?: string;
};

export type CreateLeafletPublicationResponse = {
  uri: string;
  cid: string;
  rkey: string;
};

export type CreateLeafletDocumentInput = {
  /** Document title — required by the lexicon, max 500 graphemes. */
  title: string;
  /** Body, split on blank lines into one text block per paragraph. */
  body: string;
  /** AT URI of the parent publication (`at://<did>/pub.leaflet.publication/<tid>`). */
  publicationUri: string;
  /** at-identifier — DID or handle of the document's author. */
  author: string;
};

export type CreateLeafletDocumentResponse = {
  uri: string;
  cid: string;
  rkey: string;
};

export class BlueskyLeaflet extends BlueskyApiClient {
  /** Lists the user's `pub.leaflet.publication` records on their PDS. */
  async listPublications(
    accessJwt: string,
    repo: string,
  ): Promise<{ records: LeafletPublicationRecord[]; cursor?: string }> {
    try {
      return await this.makeAuthenticatedRequest<{
        records: LeafletPublicationRecord[];
        cursor?: string;
      }>('/com.atproto.repo.listRecords', accessJwt, {
        params: {
          repo,
          collection: 'pub.leaflet.publication',
          limit: '10',
        },
      });
    } catch {
      // listRecords on a missing collection sometimes 4xx's; treat as empty.
      return { records: [] };
    }
  }

  /**
   * Returns the user's first existing publication, or creates a fresh
   * one with the supplied defaults. The composer uses this to ensure
   * every long-form post has a parent publication to live under.
   */
  async findOrCreatePublication(
    accessJwt: string,
    userDid: string,
    defaults: CreateLeafletPublicationInput,
  ): Promise<{ uri: string; cid: string; rkey: string }> {
    const existing = await this.listPublications(accessJwt, userDid);
    if (existing.records.length > 0) {
      const first = existing.records[0];
      const rkey = first.uri.split('/').pop() ?? '';
      return { uri: first.uri, cid: first.cid, rkey };
    }
    const record: Record<string, unknown> = {
      $type: 'pub.leaflet.publication',
      name: defaults.name,
    };
    if (defaults.description) record.description = defaults.description;
    const created = await this.makeAuthenticatedRequest<{ uri: string; cid: string }>(
      '/com.atproto.repo.createRecord',
      accessJwt,
      {
        method: 'POST',
        body: {
          repo: userDid,
          collection: 'pub.leaflet.publication',
          record,
        },
      },
    );
    const rkey = created.uri.split('/').pop() ?? '';
    return { ...created, rkey };
  }

  /**
   * Splits the body on blank lines and ships each paragraph as a
   * `pub.leaflet.blocks.text` block. Paragraphs starting with one or
   * more leading `#` characters become `pub.leaflet.blocks.header`
   * blocks (markdown-flavored shortcut so the user can rough-out
   * headings without leaving the textarea).
   */
  async createDocument(
    accessJwt: string,
    userDid: string,
    input: CreateLeafletDocumentInput,
  ): Promise<CreateLeafletDocumentResponse> {
    const blocks = paragraphsToBlocks(input.body);
    const record: Record<string, unknown> = {
      $type: 'pub.leaflet.document',
      title: input.title,
      author: input.author,
      publication: input.publicationUri,
      publishedAt: new Date().toISOString(),
      pages: [
        {
          $type: 'pub.leaflet.pages.linearDocument',
          blocks,
        },
      ],
    };
    const created = await this.makeAuthenticatedRequest<{ uri: string; cid: string }>(
      '/com.atproto.repo.createRecord',
      accessJwt,
      {
        method: 'POST',
        body: {
          repo: userDid,
          collection: 'pub.leaflet.document',
          record,
        },
      },
    );
    const rkey = created.uri.split('/').pop() ?? '';
    return { ...created, rkey };
  }
}

function paragraphsToBlocks(body: string): { block: Record<string, unknown> }[] {
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return paragraphs.map((para) => {
    const headingMatch = para.match(/^(#{1,6})\s+(.+)$/s);
    if (headingMatch) {
      const level = headingMatch[1].length;
      return {
        block: {
          $type: 'pub.leaflet.blocks.header',
          level,
          plaintext: headingMatch[2].trim(),
        },
      };
    }
    return {
      block: {
        $type: 'pub.leaflet.blocks.text',
        plaintext: para,
      },
    };
  });
}
