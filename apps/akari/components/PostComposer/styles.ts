import { StyleSheet } from 'react-native';

import { fontSize, fontWeight, layout, opacity, radius, shadows, spacing } from '@/constants/tokens';

export const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  webContainer: {
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    maxHeight: '90%',
    marginVertical: spacing.xl,
    borderRadius: spacing.lg,
    ...shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: layout.hairline,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerButton: {
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  headerButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.medium,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: fontWeight.semibold,
  },
  postButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    minWidth: 60,
    alignItems: 'center',
  },
  postButtonEnabled: {
    ...shadows.sm,
  },
  postButtonDisabled: {
    opacity: opacity.disabled,
  },
  postButtonText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  replyContext: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: layout.hairline,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  replyIconContainer: {
    width: spacing.xxl,
    height: spacing.xxl,
    borderRadius: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  replyText: {
    fontSize: 15,
    opacity: 0.8,
  },
  replyAuthor: {
    fontWeight: fontWeight.semibold,
  },
  contentArea: {
    flex: 1,
  },
  inputContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    position: 'relative',
  },
  threadPostBlock: {
    // Each post in the thread is its own block; the divider between
    // them lives at the top so post #0 doesn't get one.
  },
  threadDivider: {
    height: layout.hairline,
    marginHorizontal: spacing.lg,
  },
  textInputInactive: {
    opacity: 0.7,
  },
  removePostButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    padding: spacing.xs,
  },
  addPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    borderWidth: layout.hairline,
    borderStyle: 'dashed',
    borderRadius: radius.md,
  },
  addPostText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  draftsBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
  },
  modePickerRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexWrap: 'wrap',
  },
  modeChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: layout.border,
  },
  modeChipText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  modeBanner: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  longTextInput: {
    minHeight: 220,
  },
  titleInputContainer: {
    paddingBottom: spacing.md,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: fontWeight.semibold,
    paddingVertical: spacing.sm,
    borderBottomWidth: layout.hairline,
  },
  autoThreadPreview: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  autoThreadHeader: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  autoThreadChunk: {
    borderWidth: layout.hairline,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  autoThreadChunkLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  autoThreadChunkCount: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  autoThreadChunkText: {
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  draftsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: layout.hairline,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  draftsPillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  textInput: {
    fontSize: 18,
    lineHeight: 26,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  imagesContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  quoteContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  quoteCard: {
    borderWidth: layout.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quoteAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  quoteAuthorText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  quoteAuthorName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  quoteAuthorHandle: {
    fontSize: fontSize.sm,
  },
  quoteText: {
    fontSize: fontSize.base,
    lineHeight: 20,
  },
  quoteImagesRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  quoteImageThumb: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.sm,
  },
  quoteImageSingle: {
    width: '100%',
    borderRadius: radius.sm,
  },
  quoteMediaSingle: {
    width: '100%',
    borderRadius: radius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  quoteMediaImage: {
    width: '100%',
    height: '100%',
  },
  quoteVideoBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -18,
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageItem: {
    marginBottom: spacing.lg,
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
  },
  videoPreview: {
    height: 120,
    borderWidth: layout.hairline,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.md,
    overflow: 'hidden',
  },
  videoThumbnail: {
    width: 120,
    height: '100%',
  },
  videoPreviewText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  videoPreviewBody: {
    flex: 1,
    gap: spacing.xxs,
  },
  videoStatusText: {
    fontSize: fontSize.xs,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: spacing.xxs,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  attachedImage: {
    width: '100%',
    height: 200,
  },
  removeImageButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: spacing.md,
    padding: 6,
    width: spacing.xxl,
    height: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  altTextInput: {
    padding: spacing.md,
    fontSize: fontSize.base,
    borderTopWidth: layout.border,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: layout.hairline,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    // Container is the positioning context for the absolute-centered
    // threadgate button (see footerCenter).
    position: 'relative',
  },
  controlsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    maxWidth: 220,
  },
  controlsButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    flexShrink: 1,
  },
  footerLeft: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  footerCenter: {
    // Absolute-position the centered control so it's centered on the
    // FOOTER (not split-the-difference of leftover space). pointerEvents
    // box-none lets taps still hit footerLeft / footerRight when the
    // button doesn't cover them.
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  langChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: layout.border,
  },
  langChipText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  actionButton: {
    padding: 6,
    borderRadius: 6,
  },
  actionButtonDisabled: {
    opacity: opacity.tertiary,
  },
  characterCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xxs,
  },
  characterCount: {
    fontSize: 15,
    fontWeight: fontWeight.medium,
  },
});
