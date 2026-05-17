import { useThemeColor } from '@/hooks/useThemeColor';

type ComposerColors = {
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  iconColor: string;
  tintColor: string;
};

export function useComposerColors(): ComposerColors {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');
  const iconColor = useThemeColor({}, 'icon');
  const tintColor = useThemeColor({}, 'tint');
  return { backgroundColor, textColor, borderColor, iconColor, tintColor };
}
