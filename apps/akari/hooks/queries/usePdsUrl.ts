import { useQuery } from '@tanstack/react-query';

import { getPdsUrlFromDid, getPdsUrlFromHandle } from '@/bluesky-api';

/**
 * Hook to resolve PDS URL from a DID
 * @param did - The DID to resolve
 */
export function usePdsUrlFromDid(did: string | undefined) {
  return useQuery({
    queryKey: ['pdsUrl', 'did', did],
    queryFn: async () => {
      if (!did) throw new Error('No DID provided');
      return await getPdsUrlFromDid(did);
    },
    enabled: !!did,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - PDS URLs don't change often
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Hook to resolve PDS URL from a handle
 * @param handle - The handle to resolve (with or without @)
 */
export function usePdsUrlFromHandle(handle: string | undefined) {
  return useQuery({
    queryKey: ['pdsUrl', 'handle', handle],
    queryFn: async () => {
      if (!handle) throw new Error('No handle provided');
      return await getPdsUrlFromHandle(handle);
    },
    enabled: !!handle,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - PDS URLs don't change often
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
}

/**
 * Hook to resolve PDS URL from either a DID or handle
 * @param identifier - The DID or handle to resolve
 */
export function usePdsUrl(identifier: string | undefined) {
  const isDid = identifier?.startsWith('did:');

  const didQuery = usePdsUrlFromDid(isDid ? identifier : undefined);
  const handleQuery = usePdsUrlFromHandle(!isDid ? identifier : undefined);

  return {
    data: isDid ? didQuery.data : handleQuery.data,
    isLoading: isDid ? didQuery.isLoading : handleQuery.isLoading,
    error: isDid ? didQuery.error : handleQuery.error,
    isError: isDid ? didQuery.isError : handleQuery.isError,
  };
}
