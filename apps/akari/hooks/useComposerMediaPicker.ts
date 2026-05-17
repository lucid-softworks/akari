import * as ImagePicker from 'expo-image-picker';
import { useCallback } from 'react';

import type {
  AttachedImage,
  AttachedVideo,
  ThreadPost,
} from '@/utils/postComposer/types';

type UseComposerMediaPickerOptions = {
  activeIndex: number;
  setAttachedImages: (
    next: AttachedImage[] | ((prev: AttachedImage[]) => AttachedImage[]),
  ) => void;
  setPosts: React.Dispatch<React.SetStateAction<ThreadPost[]>>;
  startVideoUpload: (
    postIdx: number,
    asset: { uri: string; mimeType: string },
  ) => void;
};

type UseComposerMediaPickerResult = {
  handleAddImage: () => Promise<void>;
  handleAddVideo: () => Promise<void>;
};

/**
 * Wires the system image / video pickers into the composer. Honors the
 * "max 4 images, video XOR images" lexicon rules; the actual upload
 * + transcode pipeline runs through `startVideoUpload`.
 */
export function useComposerMediaPicker({
  activeIndex,
  setAttachedImages,
  setPosts,
  startVideoUpload,
}: UseComposerMediaPickerOptions): UseComposerMediaPickerResult {
  const handleAddImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets) {
      const newImages = result.assets.map((asset) => ({
        uri: asset.uri,
        alt: '',
        mimeType: asset.mimeType || 'image/jpeg',
      }));
      setAttachedImages((prev) => {
        const remainingSlots = Math.max(0, 4 - prev.length);
        return [...prev, ...newImages.slice(0, remainingSlots)];
      });
    }
  }, [setAttachedImages]);

  const handleAddVideo = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: false,
      quality: 0.8,
      videoMaxDuration: 60,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType || 'video/mp4';
    const targetIndex = activeIndex;
    const video: AttachedVideo = {
      uri: asset.uri,
      mimeType,
      alt: '',
      aspectRatio:
        asset.width && asset.height
          ? { width: asset.width, height: asset.height }
          : undefined,
    };
    setPosts((prev) =>
      prev.map((p, i) =>
        i === targetIndex
          ? { ...p, attachedImages: [], attachedVideo: video }
          : p,
      ),
    );
    startVideoUpload(targetIndex, { uri: asset.uri, mimeType });
  }, [activeIndex, setPosts, startVideoUpload]);

  return { handleAddImage, handleAddVideo };
}
