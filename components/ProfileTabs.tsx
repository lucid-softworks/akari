import { TabBar } from "@/components/TabBar";
import { useTranslation } from "@/hooks/useTranslation";

type TabType = "posts" | "replies" | "likes" | "media";

type ProfileTabsProps = {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
};

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  const { t } = useTranslation();

  const tabs = [
    { key: "posts" as const, label: t("common.posts") },
    { key: "replies" as const, label: t("common.replies") },
    { key: "likes" as const, label: t("common.likes") },
    { key: "media" as const, label: t("profile.media") },
  ];

  return <TabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />;
}
