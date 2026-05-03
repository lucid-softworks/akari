import { useQuery } from '@tanstack/react-query';

type HandleHistoryEntry = {
  handle: string;
  changedAt: string; // ISO timestamp
  pds: string;
};

type PlcAuditEntry = {
  did: string;
  operation: {
    type?: string;
    alsoKnownAs?: string[];
    services?: {
      atproto_pds?: {
        type?: string;
        endpoint?: string;
      };
    };
  };
  cid: string;
  nullified: boolean;
  createdAt: string;
};

/**
 * Walks a `did:plc` operation log to derive handle history. The log is the
 * canonical source — ClearSky was a third-party scrape that often returned
 * empty or stale results. plc.directory is the authoritative service.
 *
 * For each non-nullified operation we read the `alsoKnownAs[0]` (which is
 * the AT-URI form of the user's handle, e.g. `at://alice.bsky.social`) and
 * the PDS endpoint. We emit one entry per handle change, in chronological
 * order, so the UI can render them as the user's history.
 *
 * `did:web` identities don't use plc.directory; they're returned as an
 * empty list (nothing to show — their handle is the DID itself).
 */
export function useHandleHistory(identifier: string | undefined) {
  return useQuery({
    queryKey: ['handleHistory', 'plc', identifier],
    queryFn: async (): Promise<HandleHistoryEntry[]> => {
      if (!identifier) throw new Error('No identifier provided');
      if (!identifier.startsWith('did:plc:')) {
        // did:web (or anything else) doesn't have a PLC log to walk.
        return [];
      }

      const url = `https://plc.directory/${encodeURIComponent(identifier)}/log/audit`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`plc.directory returned ${response.status}`);
      }
      const log = (await response.json()) as PlcAuditEntry[];

      const entries: HandleHistoryEntry[] = [];
      let lastHandle: string | null = null;

      for (const entry of log) {
        if (entry.nullified) continue;
        const aka = entry.operation?.alsoKnownAs?.[0];
        if (!aka) continue;
        const handle = aka.startsWith('at://') ? aka.slice('at://'.length) : aka;
        if (!handle || handle === lastHandle) continue;
        entries.push({
          handle,
          changedAt: entry.createdAt,
          pds: entry.operation?.services?.atproto_pds?.endpoint ?? '',
        });
        lastHandle = handle;
      }

      // Newest first so the modal can render the current handle at the top
      // and walk back through history below it.
      return entries.reverse();
    },
    enabled: !!identifier,
    staleTime: 5 * 60 * 1000,
  });
}
