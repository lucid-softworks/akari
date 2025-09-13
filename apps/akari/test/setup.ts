import { vi } from 'vitest';

// Mock React Native components
vi.mock('react-native', () => ({
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
  },
  TouchableOpacity: 'TouchableOpacity',
  View: 'View',
  Text: 'Text',
}));

// Mock expo-router
vi.mock('expo-router', () => ({
  router: {
    push: vi.fn(),
  },
}));

// Mock expo-image
vi.mock('expo-image', () => ({
  Image: 'Image',
}));

// Mock React Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: null, isLoading: false, error: null })),
}));

// Mock hooks
vi.mock('@/hooks/queries/useProfile', () => ({
  useProfile: vi.fn(() => ({ data: null, isLoading: false, error: null })),
}));

// Mock components
vi.mock('@/components/RichTextWithFacets', () => ({
  RichTextWithFacets: 'RichTextWithFacets',
}));

vi.mock('@/components/ThemedText', () => ({
  ThemedText: 'ThemedText',
}));

vi.mock('@/components/ThemedView', () => ({
  ThemedView: 'ThemedView',
}));

vi.mock('@/components/ExternalEmbed', () => ({
  ExternalEmbed: 'ExternalEmbed',
}));

vi.mock('@/components/GifEmbed', () => ({
  GifEmbed: 'GifEmbed',
}));

vi.mock('@/components/VideoEmbed', () => ({
  VideoEmbed: 'VideoEmbed',
}));

vi.mock('@/components/YouTubeEmbed', () => ({
  YouTubeEmbed: 'YouTubeEmbed',
}));

vi.mock('@/hooks/useThemeColor', () => ({
  useThemeColor: vi.fn(() => '#000000'),
}));

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: vi.fn(() => ({
    t: (key: string) => key,
  })),
}));

vi.mock('@/utils/timeUtils', () => ({
  formatRelativeTime: vi.fn(() => '2h'),
}));
