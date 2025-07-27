import { TabBar } from "@/components/TabBar";

type TabType = "posts" | "replies" | "likes" | "media";

type ProfileTabsProps = {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
};

export function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  const tabs = [
    { key: "posts" as const, label: "Posts" },
    { key: "replies" as const, label: "Replies" },
    { key: "likes" as const, label: "Likes" },
    { key: "media" as const, label: "Media" },
  ];

  return <TabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />;
}
