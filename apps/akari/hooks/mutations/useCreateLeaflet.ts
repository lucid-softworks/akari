import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import { queryKeys } from '@/hooks/queryKeys';
import { apiForAccount } from '@/utils/blueskyApi';

export type CreateLeafletParams = {
  /** Document title — required by the lexicon. */
  title: string;
  /** Body text. Paragraphs become text blocks; lines starting with `#`
   *  become header blocks. */
  body: string;
};

export type CreateLeafletResult = {
  /** AT URI of the created `pub.leaflet.document` record. */
  uri: string;
  /** Public-web URL on leaflet.pub the user can share. */
  url: string;
};

/**
 * Publishes a long-form post as a `pub.leaflet.document` on the user's
 * PDS, creating a default `pub.leaflet.publication` first if they don't
 * have one yet. Returns the document URI and the public leaflet.pub
 * URL. The PostComposer's "long-form" mode calls this — see
 * `components/PostComposer.tsx`.
 */
export function useCreateLeaflet() {
  const queryClient = useQueryClient();
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation<CreateLeafletResult, Error, CreateLeafletParams>({
    mutationKey: ['createLeaflet'],
    mutationFn: async ({ title, body }) => {
      if (!token) throw new Error('No access token');
      if (!currentAccount?.did) throw new Error('No user DID available');
      if (!currentAccount?.pdsUrl) throw new Error('No PDS URL available');

      const api = apiForAccount(currentAccount);
      // Ensure there's a publication to file the document under.
      // Default name is the account's display name or handle — the user
      // can rename it inside Leaflet later.
      const publication = await api.findOrCreateLeafletPublication(
        token,
        currentAccount.did,
        {
          name:
            currentAccount.displayName?.trim() ||
            currentAccount.handle ||
            'My Leaflet',
        },
      );

      const created = await api.createLeafletDocument(token, currentAccount.did, {
        title,
        body,
        publicationUri: publication.uri,
        author: currentAccount.did,
      });

      // Public-web URL pattern Leaflet uses for documents that don't
      // have a custom subdomain set up yet:
      //   https://leaflet.pub/lish/<did>/<pub-rkey>/<doc-rkey>
      // (Custom-subdomain publications resolve via base_path; we don't
      //  set base_path on the auto-created one.)
      const url = `https://leaflet.pub/lish/${encodeURIComponent(
        currentAccount.did,
      )}/${publication.rkey}/${created.rkey}`;

      return { uri: created.uri, url };
    },
    onSuccess: () => {
      // New leaflet document lives in the author's repo and may surface
      // in their author feed/posts views.
      queryClient.invalidateQueries({ queryKey: queryKeys.author.repos(currentAccount?.did, 50, currentAccount?.pdsUrl) });
      queryClient.invalidateQueries({ queryKey: queryKeys.author.feed.forDid(currentAccount?.did ?? undefined) });
    },
  });
}
