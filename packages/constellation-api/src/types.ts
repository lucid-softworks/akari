export type ConstellationStats = {
  dids: number;
  targetables: number;
  linking_records: number;
};

export type ConstellationServerInfo = {
  help: string;
  days_indexed: number;
  stats: ConstellationStats;
};

type ConstellationTargetedQuery = {
  target: string;
  collection: string;
  path: string;
};

export type ConstellationLinksQuery = ConstellationTargetedQuery & {
  cursor?: string;
};

export type ConstellationCountQuery = ConstellationLinksQuery;

export type ConstellationLinkRecord = {
  did: string;
  collection: string;
  rkey: string;
};

export type ConstellationLinksResponse = {
  total: number;
  linking_records: ConstellationLinkRecord[];
  cursor: string | null;
};

export type ConstellationDistinctDidsResponse = {
  total: number;
  linking_dids: string[];
  cursor: string | null;
};

export type ConstellationCountResponse = {
  total: number;
  cursor?: string | null;
};

export type ConstellationDistinctDidCountResponse = ConstellationCountResponse;

export type ConstellationAllLinksQuery = {
  target: string;
};

export type ConstellationLinkAggregate = {
  records: number;
  distinct_dids: number;
};

export type ConstellationAllLinksResponse = {
  links: Record<string, Record<string, ConstellationLinkAggregate>>;
};
