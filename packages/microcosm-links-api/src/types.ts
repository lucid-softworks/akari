export type MicrocosmBacklinkRecord = {
  did: string;
  collection: string;
  rkey: string;
};

export type MicrocosmBacklinksResponse = {
  total: number;
  records: MicrocosmBacklinkRecord[];
  cursor: string | null;
};

export type MicrocosmBacklinksQuery = {
  subject: string;
  source: string;
  limit?: number;
  cursor?: string;
  did?: string | readonly string[];
};

export type MicrocosmManyToManyCount = {
  subject: string;
  total: number;
  distinct: number;
};

export type MicrocosmManyToManyCountsResponse = {
  counts_by_other_subject: MicrocosmManyToManyCount[];
  cursor: string | null;
};

export type MicrocosmManyToManyCountsQuery = MicrocosmBacklinksQuery & {
  pathToOther: string;
  otherSubject?: string | readonly string[];
};
