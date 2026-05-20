import { View } from 'react-native';

import { TabBar } from '@/components/TabBar';
import { webColumnSideBorders } from '@/constants/webStyles';
import { useBorderColor } from '@/hooks/useBorderColor';
import { useCurrentAccount } from '@/hooks/queries/useCurrentAccount';
import { useTranslation } from '@/hooks/useTranslation';
import type { ProfileTabType } from '@/types/profile';

type ProfileTabsProps = {
  activeTab: ProfileTabType;
  onTabChange: (tab: ProfileTabType) => void;
  profileHandle: string;
};

export function ProfileTabs({ activeTab, onTabChange, profileHandle }: ProfileTabsProps) {
  const { t } = useTranslation();
  const { data: currentUser } = useCurrentAccount();
  const borderColor = useBorderColor();

  const isOwnProfile = currentUser?.handle === profileHandle;

  const tabs = [
    { key: 'posts' as const, label: t('common.posts') },
    { key: 'replies' as const, label: t('common.replies') },
    { key: 'resume' as const, label: t('profile.resume') },
    { key: 'media' as const, label: t('profile.media') },
    ...(isOwnProfile ? [{ key: 'likes' as const, label: t('common.likes') }] : []),
    { key: 'videos' as const, label: t('profile.videos') },
    { key: 'photos' as const, label: t('profile.photos') },
    { key: 'rpgItems' as const, label: t('profile.rpgItems') },
    { key: 'feeds' as const, label: t('profile.feeds') },
    { key: 'repos' as const, label: t('profile.repos') },
    { key: 'starterpacks' as const, label: t('profile.starterpacks') },
    { key: 'recipes' as const, label: t('profile.recipes') },
    { key: 'links' as const, label: t('profile.links') },
  ];

  return (
    <View style={webColumnSideBorders(borderColor)}>
      <TabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
    </View>
  );
}
