import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AvatarOrInitial } from '@/components/AvatarOrInitial';
import { Image } from '@/components/Image';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { activeOpacity, fontSize, fontWeight, layout, opacity, radius, spacing } from '@/constants/tokens';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';
import { openExternalLink } from '@/utils/externalLink';
import { resolveExternalThumb } from '@/utils/embedThumb';
import { useNavigateToProfile } from '@/utils/navigation';

type StandardSource = {
  $type?: string;
  uri: string;
  icon?: string;
  title?: string;
  description?: string;
};

type StandardAssociatedProfile = {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
};

type StandardDocumentEmbedProps = {
  /** Plain text (`title`, `description`) and thumb come straight off the
   *  shared external embed; the AppView-enriched fields are passed
   *  individually so this component doesn't have to know the full
   *  BlueskyExternal shape. */
  uri: string;
  title: string;
  description: string;
  thumb: unknown;
  publishedAt?: string;
  readingTime?: number;
  source: StandardSource;
  /** First entry is rendered as the byline author. */
  associatedProfiles?: StandardAssociatedProfile[];
};

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

function formatPublishedDate(iso: string | undefined, locale: string): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  let formatter = dateFormatters.get(locale);
  if (!formatter) {
    // oxlint-disable-next-line react-doctor/js-hoist-intl -- cached per-locale; locale is dynamic, can't hoist to module scope
    formatter = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    dateFormatters.set(locale, formatter);
  }
  return formatter.format(date);
}

/**
 * Detect whether a `BlueskyExternal`-shaped value is a Standard.site
 * publication link (pckt.blog, augment.ink, standard.site, etc.). The
 * AppView signals this by attaching a `source` object whose `$type`
 * matches the `viewExternalSource` open-union sentinel; falling through
 * to `external.source` truthiness alone would risk false positives if
 * another lexicon adopts the field name later.
 */
export function isStandardSiteExternal(external: {
  source?: { $type?: string };
}): boolean {
  return external.source?.$type === 'app.bsky.embed.external#viewExternalSource';
}

/**
 * Rich link card for Standard.site publications. Differs from the
 * generic `ExternalEmbed` in three ways:
 *  - Hero image runs full width (16:9) instead of a 80×80 thumb gutter.
 *  - Date + reading time render in the body, fed by AppView fields
 *    that aren't on a plain external link.
 *  - A publication footer (icon + name + `by @author`) plus a CTA
 *    pill replace the bare domain row — the publication identity is
 *    a first-class affordance here, mirroring bsky.app's treatment.
 *
 * Taps:
 *  - Body / CTA → open the document URL externally.
 *  - Author byline → in-app profile via `useNavigateToProfile` so the
 *    back-stack stays inside the originating tab on native.
 */
export function StandardDocumentEmbed({
  uri,
  title,
  description,
  thumb,
  publishedAt,
  readingTime,
  source,
  associatedProfiles,
}: StandardDocumentEmbedProps) {
  const { t } = useTranslation();
  const { currentLocale } = useLanguage();
  const navigateToProfile = useNavigateToProfile();
  const borderColor = useBorderColor();
  const subduedTextColor = useThemeColor({ light: '#6B7280', dark: '#9CA3AF' }, 'text');
  const tintColor = useThemeColor({}, 'tint');
  const footerBg = useThemeColor({ light: '#F3F4F6', dark: '#0B0F19' }, 'background');

  const thumbUrl = resolveExternalThumb(thumb);
  const formattedDate = formatPublishedDate(publishedAt, currentLocale);
  const byline = associatedProfiles?.[0];

  const handleOpenDocument = useCallback(
    (event?: { stopPropagation?: () => void }) => {
      event?.stopPropagation?.();
      void openExternalLink(uri);
    },
    [uri],
  );

  const handleOpenPublication = useCallback(
    (event?: { stopPropagation?: () => void }) => {
      event?.stopPropagation?.();
      void openExternalLink(source.uri);
    },
    [source.uri],
  );

  const handleOpenAuthor = useCallback(
    (event?: { stopPropagation?: () => void }) => {
      event?.stopPropagation?.();
      if (!byline) return;
      navigateToProfile({ actor: byline.handle });
    },
    [byline, navigateToProfile],
  );

  // Meta-line text: "May 30, 2026 · 8m" (date and read time both
  // optional; collapse the separator if either is missing).
  const metaParts = [
    formattedDate,
    typeof readingTime === 'number' ? t('post.standardReadingTime', { count: readingTime }) : null,
  ].filter(Boolean) as string[];

  return (
    <View style={[styles.container, { borderColor }]}>
      <Pressable
        onPress={handleOpenDocument}
        accessibilityRole="link"
        accessibilityLabel={t('post.standardOpenDocument', { title })}
        style={({ pressed }) => [styles.bodyPressable, pressed && { opacity: activeOpacity.subtle }]}
      >
        {thumbUrl ? (
          <Image source={{ uri: thumbUrl }} style={styles.hero} contentFit="cover" />
        ) : null}

        <ThemedView style={styles.body}>
          <ThemedText style={styles.title} numberOfLines={2}>
            {title}
          </ThemedText>
          {description ? (
            <ThemedText
              style={[styles.description, { color: subduedTextColor }]}
              numberOfLines={3}
            >
              {description}
            </ThemedText>
          ) : null}
          {metaParts.length > 0 ? (
            <View style={styles.metaRow}>
              <ThemedText style={[styles.metaText, { color: subduedTextColor }]}>
                {metaParts.join('  ·  ')}
              </ThemedText>
            </View>
          ) : null}
        </ThemedView>
      </Pressable>

      <View style={[styles.footer, { backgroundColor: footerBg, borderTopColor: borderColor }]}>
        <Pressable
          onPress={handleOpenPublication}
          accessibilityRole="link"
          accessibilityLabel={t('post.standardOpenPublication', {
            name: source.title ?? source.uri,
          })}
          style={({ pressed }) => [styles.publicationCell, pressed && { opacity: activeOpacity.subtle }]}
        >
          <AvatarOrInitial
            uri={source.icon}
            seed={source.title ?? source.uri}
            size={32}
            style={styles.publicationIcon}
          />
          <View style={styles.publicationText}>
            <ThemedText style={styles.publicationName} numberOfLines={1}>
              {source.title ?? source.uri}
            </ThemedText>
            {byline ? (
              <Pressable
                onPress={handleOpenAuthor}
                accessibilityRole="link"
                accessibilityLabel={t('post.standardOpenAuthor', {
                  handle: byline.handle,
                })}
                hitSlop={spacing.xs}
                style={({ pressed }) => pressed && { opacity: activeOpacity.subtle }}
              >
                <ThemedText style={[styles.bylineText, { color: subduedTextColor }]} numberOfLines={1}>
                  {t('post.standardByline', { handle: byline.handle })}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </Pressable>

        <Pressable
          onPress={handleOpenPublication}
          accessibilityRole="link"
          accessibilityLabel={t('post.standardOpenPublication', {
            name: source.title ?? source.uri,
          })}
          style={({ pressed }) => [
            styles.ctaPill,
            { backgroundColor: tintColor },
            pressed && { opacity: activeOpacity.default },
          ]}
        >
          <IconSymbol name="arrow.up.right" size={fontSize.sm} color="#ffffff" />
          <ThemedText style={styles.ctaText}>{t('post.standardViewPublication')}</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    borderRadius: radius.md,
    borderWidth: layout.border,
    overflow: 'hidden',
  },
  bodyPressable: {
    // The hero + body together act as one tap target. No padding here
    // so the hero butts up against the edges.
  },
  hero: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  body: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    lineHeight: 26,
  },
  description: {
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  metaRow: {
    marginTop: spacing.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
    // Match the dot separator spacing the bsky.app card uses.
    letterSpacing: 0.2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: layout.hairline,
  },
  publicationCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  publicationIcon: {
    borderRadius: radius.sm,
  },
  publicationText: {
    flex: 1,
    minWidth: 0,
  },
  publicationName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  bylineText: {
    fontSize: fontSize.sm,
    opacity: opacity.secondary,
  },
  ctaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  ctaText: {
    color: '#ffffff',
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
