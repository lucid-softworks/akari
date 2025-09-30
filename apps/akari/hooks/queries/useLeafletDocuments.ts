import { useInfiniteQuery } from '@tanstack/react-query';
import { useRef } from 'react';

import { BlueskyApi, getPdsUrlFromDid } from '@/bluesky-api';
import type { BlueskyRepoRecord } from '@/bluesky-api';

export type LeafletDocumentListItem = BlueskyRepoRecord<LeafletDocumentRecord>;

export type LeafletDocumentRecord = {
  $type?: string;
  title?: string;
  description?: string;
  publishedAt?: string;
  pages?: LeafletDocumentPage[];
  postRef?: {
    uri?: string;
    cid?: string;
  };
};

export type LeafletDocumentPage = {
  $type?: string;
  blocks?: LeafletDocumentBlock[];
};

export type LeafletDocumentBlock = {
  $type?: string;
  block: {
    $type?: string;
    plaintext?: string;
    level?: number;
    src?: string;
    title?: string;
    description?: string;
    postRef?: {
      uri?: string;
      cid?: string;
    };
    facets?: {
      index: {
        byteStart: number;
        byteEnd: number;
      };
      features: {
        $type: string;
        uri?: string;
      }[];
    }[];
    children?: LeafletListItem[];
  };
  alignment?: string;
  children?: {
    content: {
      $type?: string;
      plaintext?: string;
    };
    children?: unknown[];
  }[];
};

export type LeafletListItem = {
  $type?: string;
  content?: {
    $type?: string;
    plaintext?: string;
  };
  children?: LeafletListItem[];
};

/**
 * Infinite query hook that loads Leaflet documents for a profile directly from their repository.
 * @param did - DID of the author whose Leaflet posts should be retrieved.
 * @param limit - Maximum number of records to request per page (default: 10).
 */
export function useLeafletDocuments(did: string | undefined, limit: number = 10) {
  const pdsUrlRef = useRef<string | null>(null);

  return useInfiniteQuery({
    queryKey: ['leafletDocuments', did, limit],
    enabled: !!did,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.cursor,
    staleTime: 5 * 60 * 1000,
    select: (data) => data.pages.flatMap((page) => page.documents),
    queryFn: async ({ pageParam }) => {
      if (!did) {
        throw new Error('No DID provided');
      }

      let pdsUrl = pdsUrlRef.current;
      if (!pdsUrl) {
        pdsUrl = await getPdsUrlFromDid(did);
        if (!pdsUrl) {
          throw new Error('Unable to resolve PDS URL');
        }
        pdsUrlRef.current = pdsUrl;
      }

      const api = new BlueskyApi(pdsUrl);
      const response = await api.listRecords<LeafletDocumentRecord>({
        collection: 'pub.leaflet.document',
        repo: did,
        limit,
        cursor: pageParam,
        reverse: true,
      });

      return {
        documents: response.records,
        cursor: response.cursor,
      };
    },
  });
}
