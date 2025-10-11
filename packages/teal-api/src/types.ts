export type TealArtist = {
  artistName: string;
};

export type TealPlayRecord = {
  trackName: string;
  artists: TealArtist[];
  playedTime: string;
};

export type TealListRecordsResponse = {
  cursor?: string;
  records: {
    uri: string;
    cid: string;
    value: TealPlayRecord;
  }[];
};
