import React, { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { fontSize, fontWeight, spacing } from '@/constants/tokens';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useTranslation } from '@/hooks/useTranslation';

/** Decoded EXIF (grain stores the numeric fields scaled by 1e6 — decode before passing here). */
export type LightboxExif = {
  make?: string;
  model?: string;
  lensModel?: string;
  /** ƒ-number, e.g. 1.78 */
  fNumber?: number;
  /** Shutter speed in seconds, e.g. 0.00833 */
  exposureTime?: number;
  iso?: number;
  /** Focal length in 35mm-equivalent mm, e.g. 24 */
  focalLength35mm?: number;
  dateTimeOriginal?: string;
  flash?: string;
};

export type LightboxMeta = {
  alt?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  mimeType?: string;
  exif?: LightboxExif;
};

const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

function formatBytes(bytes?: number): string | undefined {
  if (!bytes || bytes <= 0) return undefined;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function formatAperture(f?: number): string | undefined {
  if (!f || f <= 0) return undefined;
  const s = f.toFixed(2).replace(/\.?0+$/, '');
  return `ƒ/${s}`;
}

function formatShutter(seconds?: number): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  if (seconds >= 1) return `${seconds.toFixed(1).replace(/\.0$/, '')} s`;
  return `1/${Math.round(1 / seconds)} s`;
}

function formatFocal(mm?: number): string | undefined {
  if (!mm || mm <= 0) return undefined;
  return `${Math.round(mm)} mm`;
}

function formatMime(mime?: string): string | undefined {
  if (!mime) return undefined;
  return mime.replace(/^image\//, '').toUpperCase();
}

type LightboxInfoPanelProps = {
  meta: LightboxMeta;
  index: number;
  total: number;
  onClose: () => void;
};

/**
 * Darkroom-style metadata panel for the lightbox. Monospace, `// SECTION`
 * headers, dotted leader rows. EXIF (camera / exposure) only appears for
 * images that carry a `social.grain.photo.exif` sidecar — Bluesky strips
 * EXIF on upload so those sections stay hidden for ordinary post images.
 */
export function LightboxInfoPanel({ meta, index, total, onClose }: LightboxInfoPanelProps) {
  const { t } = useTranslation();
  const accent = useThemeColor({}, 'tint');
  const panelBg = '#0b0b0d';
  const fg = '#e6e6e6';
  const dim = '#6b6b72';

  const exif = meta.exif;
  const dimensions = meta.width && meta.height ? `${meta.width} × ${meta.height}` : undefined;

  const camera = useMemo(() => {
    const rows: { label: string; value: string }[] = [];
    if (exif?.model) rows.push({ label: t('lightbox.model'), value: exif.model });
    if (exif?.make && exif.make !== exif?.model) {
      rows.push({ label: t('lightbox.make'), value: exif.make });
    }
    if (exif?.lensModel) rows.push({ label: t('lightbox.lens'), value: exif.lensModel });
    return rows;
  }, [exif, t]);

  const exposure = useMemo(() => {
    const rows: { label: string; value: string; accent?: boolean }[] = [];
    const ap = formatAperture(exif?.fNumber);
    if (ap) rows.push({ label: t('lightbox.aperture'), value: ap, accent: true });
    const sh = formatShutter(exif?.exposureTime);
    if (sh) rows.push({ label: t('lightbox.shutter'), value: sh });
    if (exif?.iso) rows.push({ label: t('lightbox.iso'), value: String(Math.round(exif.iso)) });
    const fl = formatFocal(exif?.focalLength35mm);
    if (fl) rows.push({ label: t('lightbox.focalLength'), value: fl });
    if (exif?.flash) rows.push({ label: t('lightbox.flash'), value: exif.flash });
    return rows;
  }, [exif, t]);

  const file = useMemo(() => {
    const rows: { label: string; value: string }[] = [];
    if (dimensions) rows.push({ label: t('lightbox.dimensions'), value: dimensions });
    const mime = formatMime(meta.mimeType);
    if (mime) rows.push({ label: t('lightbox.format'), value: mime });
    const size = formatBytes(meta.sizeBytes);
    if (size) rows.push({ label: t('lightbox.size'), value: size });
    return rows;
  }, [dimensions, meta.mimeType, meta.sizeBytes, t]);

  return (
    <View style={[styles.panel, { backgroundColor: panelBg }]}>
      {/* Status bar */}
      <View style={[styles.statusBar, { borderBottomColor: '#1c1c20' }]}>
        <View style={styles.statusLeft}>
          <View style={[styles.statusDot, { backgroundColor: accent }]} />
          <ThemedText style={[styles.statusLabel, { color: accent }]}>
            {t('lightbox.viewing')}
          </ThemedText>
          {total > 1 ? (
            <ThemedText style={[styles.statusMeta, { color: dim }]}>
              {t('lightbox.frame', {
                current: String(index + 1).padStart(2, '0'),
                total: String(total).padStart(2, '0'),
              })}
            </ThemedText>
          ) : null}
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <IconSymbol name="xmark" size={16} color={dim} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {meta.alt ? (
          <Section title={t('lightbox.alt')} accent={accent}>
            <View style={[styles.altBox, { borderLeftColor: accent }]}>
              <ThemedText style={[styles.altText, { color: fg }]}>{meta.alt}</ThemedText>
            </View>
          </Section>
        ) : null}

        {camera.length > 0 ? (
          <Section title={t('lightbox.camera')} accent={accent}>
            {camera.map((row) => (
              <MetaRow key={row.label} label={row.label} value={row.value} fg={fg} dim={dim} />
            ))}
          </Section>
        ) : null}

        {exposure.length > 0 ? (
          <Section title={t('lightbox.exposure')} accent={accent}>
            {exposure.map((row) => (
              <MetaRow
                key={row.label}
                label={row.label}
                value={row.value}
                fg={row.accent ? accent : fg}
                dim={dim}
              />
            ))}
          </Section>
        ) : null}

        {file.length > 0 ? (
          <Section title={t('lightbox.file')} accent={accent}>
            {file.map((row) => (
              <MetaRow key={row.label} label={row.label} value={row.value} fg={fg} dim={dim} />
            ))}
          </Section>
        ) : null}
      </ScrollView>

      {/* Keyboard hint footer */}
      <View style={[styles.footer, { borderTopColor: '#1c1c20' }]}>
        <ThemedText style={[styles.hint, { color: dim }]}>
          {Platform.OS === 'web' ? t('lightbox.hintsWeb') : t('lightbox.hintsTouch')}
        </ThemedText>
      </View>
    </View>
  );
}

function Section({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText style={[styles.sectionTitle, { color: accent }]}>{`// ${title}`}</ThemedText>
      {children}
    </View>
  );
}

function MetaRow({
  label,
  value,
  fg,
  dim,
}: {
  label: string;
  value: string;
  fg: string;
  dim: string;
}) {
  return (
    <View style={styles.metaRow}>
      <ThemedText style={[styles.metaLabel, { color: dim }]}>{label}</ThemedText>
      <View style={[styles.leader, { borderBottomColor: '#2a2a30' }]} />
      <ThemedText style={[styles.metaValue, { color: fg }]} numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontFamily: MONO,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 1,
  },
  statusMeta: {
    fontFamily: MONO,
    fontSize: fontSize.xs,
    letterSpacing: 0.5,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontFamily: MONO,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    letterSpacing: 1.5,
  },
  altBox: {
    borderLeftWidth: 2,
    paddingLeft: spacing.md,
    paddingVertical: spacing.xs,
  },
  altText: {
    fontFamily: MONO,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  metaLabel: {
    fontFamily: MONO,
    fontSize: fontSize.sm,
  },
  leader: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dotted',
    marginBottom: 4,
  },
  metaValue: {
    fontFamily: MONO,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  hint: {
    fontFamily: MONO,
    fontSize: fontSize.xs,
    letterSpacing: 0.5,
  },
});
