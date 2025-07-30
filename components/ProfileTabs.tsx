import { TabBar } from '@/components/TabBar';
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

  const isOwnProfile = currentUser?.handle === profileHandle;

  const tabs = [
    { key: 'posts' as const, label: t('common.posts') },
    { key: 'replies' as const, label: t('common.replies') },
    { key: 'media' as const, label: t('profile.media') },
    ...(isOwnProfile ? [{ key: 'likes' as const, label: t('common.likes') }] : []),
    { key: 'videos' as const, label: t('profile.videos') },
    { key: 'feeds' as const, label: t('profile.feeds') },
    { key: 'starterpacks' as const, label: t('profile.starterpacks') },
  ];

  return <TabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />;
}
