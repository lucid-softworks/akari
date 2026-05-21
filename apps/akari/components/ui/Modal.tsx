import React from 'react';
import { Modal as RNModal, type ModalProps as RNModalProps } from 'react-native';

import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

/**
 * Drop-in replacement for `react-native`'s `Modal` that engages the
 * shared `useBodyScrollLock` while the modal is visible. RN's Modal
 * portals its markup on web but leaves the underlying document
 * scrollable; the lock pins `<html>` + `<body>` (with the iOS
 * Safari `position: fixed` trick) so the page doesn't drift behind
 * the dialog.
 *
 * Native platforms are untouched — `pageSheet` / `fullScreen` already
 * cover the underlying view, so there's nothing to lock.
 *
 * Most app code should reach for the higher-level `Dialog` primitive;
 * this stays as the raw escape hatch for takeover surfaces
 * (ImageViewer, EmojiPicker, etc.) that don't want Dialog's chrome.
 */
export function Modal(props: RNModalProps) {
  useBodyScrollLock(props.visible !== false);
  return <RNModal {...props} />;
}
