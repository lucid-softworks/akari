import { TabBar } from "@/components/TabBar";
import { useTranslation } from "@/hooks/useTranslation";

type TabType = "all" | "users" | "posts";

type SearchTabsProps = {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  /** Drops the "All" tab from the bar when true. For guests, "All"
   *  collapses to "Users" (post search is auth-gated) so the combined
   *  tab is redundant — show Users / Posts and let the Posts tab itself
   *  surface the sign-in CTA. */
  isGuest?: boolean;
};

export function SearchTabs({ activeTab, onTabChange, isGuest }: SearchTabsProps) {
  const { t } = useTranslation();

  const tabs = isGuest
    ? [
        { key: "users" as const, label: t("search.users") },
        { key: "posts" as const, label: t("search.posts") },
      ]
    : [
        { key: "all" as const, label: t("search.all") },
        { key: "users" as const, label: t("search.users") },
        { key: "posts" as const, label: t("search.posts") },
      ];

  return <TabBar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />;
}
