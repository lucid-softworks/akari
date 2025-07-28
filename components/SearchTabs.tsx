import { TabBar } from "@/components/TabBar";
import { useTranslation } from "@/hooks/useTranslation";

type TabType = "all" | "users" | "posts";

type SearchTabsProps = {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
};

export function SearchTabs({ activeTab, onTabChange }: SearchTabsProps) {
  const { t } = useTranslation();

  const tabs = [
    { key: "all" as const, label: t("search.all") },
    { key: "users" as const, label: t("search.users") },
    { key: "posts" as const, label: t("search.posts") },
  ];

  return <TabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />;
}
