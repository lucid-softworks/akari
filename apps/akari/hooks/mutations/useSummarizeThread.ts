import { useMutation } from '@tanstack/react-query';

import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useJwtToken } from '@/hooks/queries/useJwtToken';
import {
  BlueskyApi,
  type BlueskyFeedItem,
  type BlueskyPostView,
  type BlueskyThreadItem,
} from '@/bluesky-api';

type SummarizeThreadInput = {
  postUri: string;
};

type SummarizeThreadResult = {
  summary: string;
};

const MAX_POSTS_IN_PROMPT = 12;

const getRecordText = (record: Record<string, unknown> | undefined) => {
  if (!record || typeof record !== 'object') {
    return undefined;
  }

  if ('text' in record && typeof (record as { text?: unknown }).text === 'string') {
    const value = (record as { text?: string }).text;
    return value?.trim() ?? undefined;
  }

  return undefined;
};

const normalisePost = (post: BlueskyPostView | null | undefined) => {
  if (!post?.author?.handle) {
    return null;
  }

  const text = getRecordText(post.record);
  if (!text) {
    return null;
  }

  const displayName = post.author.displayName?.trim();
  const authorLabel = displayName ? `${displayName} (@${post.author.handle})` : `@${post.author.handle}`;

  return `${authorLabel}: ${text.replace(/\s+/g, ' ')}`;
};

const flattenThreadItems = (items: BlueskyThreadItem[] | undefined) => {
  if (!items?.length) {
    return [] as string[];
  }

  const results: string[] = [];

  for (const item of items) {
    if ('post' in item) {
      const feedItem = item as BlueskyFeedItem;
      const entry = normalisePost(feedItem.post);
      if (entry) {
        results.push(entry);
      }
      continue;
    }

    if (item && !('blocked' in item) && !('notFound' in item)) {
      const entry = normalisePost(item as BlueskyPostView);
      if (entry) {
        results.push(entry);
      }
    }
  }

  return results;
};

const buildPrompt = (entries: string[]) => {
  const lines = entries.slice(0, MAX_POSTS_IN_PROMPT);

  return [
    'Summarize the following Bluesky thread in three sentences or fewer.',
    'Highlight the main topic and call out any disagreements if they appear.',
    '',
    'Thread:',
    ...lines.map((line, index) => `${index + 1}. ${line}`),
  ].join('\n');
};

const loadAppleModule = async () => {
  try {
    return await import('@react-native-ai/apple');
  } catch (error) {
    throw new Error('appleUnavailable');
  }
};

export function useSummarizeThread() {
  const { data: token } = useJwtToken();
  const { data: currentAccount } = useCurrentAccount();

  return useMutation<SummarizeThreadResult, Error, SummarizeThreadInput>({
    mutationKey: ['summarizeThread'],
    mutationFn: async ({ postUri }) => {
      if (!token || !currentAccount?.pdsUrl) {
        throw new Error('missingCredentials');
      }

      if (!postUri) {
        throw new Error('noText');
      }

      let appleModule: Awaited<ReturnType<typeof loadAppleModule>>;

      try {
        appleModule = await loadAppleModule();
      } catch (error) {
        throw error instanceof Error ? error : new Error('appleUnavailable');
      }

      const { apple } = appleModule;

      if (!apple?.isAvailable?.()) {
        throw new Error('appleUnavailable');
      }

      const api = new BlueskyApi(currentAccount.pdsUrl);

      let mainPost: BlueskyPostView | null = null;
      let threadEntries: string[] = [];

      try {
        const [postResponse, threadResponse] = await Promise.all([
          api.getPost(token, postUri).catch(() => null),
          api.getPostThread(token, postUri).catch(() => null),
        ]);

        if (postResponse) {
          mainPost = postResponse;
        }

        if (threadResponse?.thread?.replies) {
          threadEntries = flattenThreadItems(threadResponse.thread.replies);
        }
      } catch (error) {
        throw new Error('failed');
      }

      const compiledEntries: string[] = [];

      const mainEntry = normalisePost(mainPost);
      if (mainEntry) {
        compiledEntries.push(mainEntry);
      }

      if (threadEntries.length) {
        compiledEntries.push(...threadEntries);
      }

      if (!compiledEntries.length) {
        throw new Error('noText');
      }

      const prompt = buildPrompt(compiledEntries);

      try {
        const { generateText } = await import('ai');
        const result = await generateText({
          model: apple(),
          prompt,
          temperature: 0.2,
          maxTokens: 320,
        });

        const summary = result.text.trim();

        if (!summary) {
          throw new Error('failed');
        }

        return { summary };
      } catch (error) {
        throw new Error('failed');
      }
    },
  });
}
