import type { BlueskyEmbed, BlueskyVerification } from '@/bluesky-api';
import type en from '@/translations/en';

export type Reaction = {
  value: string;
  sender: { did: string };
  createdAt: string;
};

export type Message = {
  id: string;
  text: string;
  timestamp: string;
  isFromMe: boolean;
  senderDid: string;
  sentAt: string;
  embed?: BlueskyEmbed;
  reactions: Reaction[];
};

export type ConvoMember = {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
  verification?: BlueskyVerification;
};

export type Conversation = {
  id: string;
  convoId: string;
  handle: string;
  displayName: string;
  avatar?: string;
  verification?: BlueskyVerification;
  members: ConvoMember[];
  isGroup: boolean;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  status: 'request' | 'accepted';
  muted: boolean;
};

type CommonTranslationKey = keyof typeof en.common;
export type CommonTranslationPath = `common.${CommonTranslationKey}`;

export type PendingButtonConfig = {
  labelKey: CommonTranslationPath;
  onPress: () => void;
};
