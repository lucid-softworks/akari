import { TabBar } from "@/components/TabBar";

type TabType = "all" | "users" | "posts";

type SearchTabsProps = {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
};

export function SearchTabs({ activeTab, onTabChange }: SearchTabsProps) {
  const tabs = [
    { key: "all" as const, label: "All" },
    { key: "users" as const, label: "Users" },
    { key: "posts" as const, label: "Posts" },
  ];

  return <TabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />;
}
