/**
 * Mastodon instance-wide announcements. Surface above the home feed for
 * Mastodon accounts; users dismiss them individually.
 *
 * `GET /api/v1/announcements` returns only currently-active, non-dismissed
 * announcements by default (`with_dismissed=false` is the documented
 * default), so the client doesn't need to filter on `read` / `ends_at`
 * itself. We honour that and trust the server to scope the list.
 */

/**
 * Subset of Mastodon's `Announcement` entity. `content` is HTML the
 * server already rendered (the same shape as `Status.content`), so the
 * UI side strips it with the same helper as posts.
 */
export type MastodonAnnouncement = {
  id: string;
  /** Server-rendered HTML body. */
  content: string;
  /** Whether the viewer has dismissed this — we filter by this defensively
   *  even though the server already does, in case a custom server returns
   *  dismissed entries. */
  read: boolean;
  /** ISO timestamps. We don't render these yet (MVP) but keep them on the
   *  type so future versions can show "Starts in 2 days" / "Ends today". */
  starts_at: string | null;
  ends_at: string | null;
  published_at: string;
  updated_at: string;
};

export type FetchAnnouncementsInput = {
  instanceUrl: string;
  accessToken: string;
};

export async function fetchMastodonAnnouncements(
  input: FetchAnnouncementsInput,
): Promise<MastodonAnnouncement[]> {
  const res = await fetch(`${input.instanceUrl}/api/v1/announcements`, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    // 404 means the server doesn't support announcements at all (older
    // Pleroma forks, some GoToSocial configurations). Treat as "no
    // announcements" rather than an error — there's nothing for the user
    // to do about it and we don't want to surface red ink at the top of
    // every home feed visit.
    if (res.status === 404) return [];
    throw new Error(`Mastodon announcements failed (HTTP ${res.status}).`);
  }

  const json = (await res.json().catch(() => null)) as MastodonAnnouncement[] | null;
  if (!Array.isArray(json)) return [];
  return json;
}

export type DismissAnnouncementInput = {
  instanceUrl: string;
  accessToken: string;
  announcementId: string;
};

export async function dismissMastodonAnnouncement(
  input: DismissAnnouncementInput,
): Promise<void> {
  const res = await fetch(
    `${input.instanceUrl}/api/v1/announcements/${encodeURIComponent(input.announcementId)}/dismiss`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
        Accept: 'application/json',
      },
    },
  );
  if (!res.ok) {
    throw new Error(`Dismissing announcement failed (HTTP ${res.status}).`);
  }
}
