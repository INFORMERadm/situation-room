export interface ChatUserProfile {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  avatar_url: string | null;
  n4_email: string;
}

export type ConversationType = 'direct' | 'group';
export type ParticipantRole = 'admin' | 'member';
export type MessageType = 'text' | 'file' | 'link' | 'system' | 'ai';
export type FileTransferStatus = 'uploading' | 'complete' | 'failed';
export type VoiceSessionStatus = 'active' | 'ended';
export type ChatView = 'list' | 'thread' | 'new-chat' | 'new-group';

export interface Conversation {
  id: string;
  type: ConversationType;
  name: string | null;
  avatar_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  participants: Participant[];
  lastMessage?: DecryptedMessage;
  unreadCount: number;
}

export interface Participant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: ParticipantRole;
  public_key: string | null;
  encrypted_conversation_key: string | null;
  joined_at: string;
  last_read_at: string | null;
  profile?: ChatUserProfile;
}

export interface EncryptedMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  encrypted_content: string;
  iv: string;
  message_type: MessageType;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DecryptedMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  metadata: Record<string, unknown>;
  created_at: string;
  senderProfile?: ChatUserProfile;
  fileTransfer?: FileTransfer;
  linkPreview?: LinkPreview;
}

export interface FileTransfer {
  id: string;
  message_id: string;
  sender_id: string;
  encrypted_file_url: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  thumbnail_url: string | null;
  status: FileTransferStatus;
  created_at: string;
}

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image_url: string | null;
  site_name: string | null;
}

export interface VoiceSession {
  id: string;
  conversation_id: string;
  started_by: string;
  status: VoiceSessionStatus;
  ai_participant_enabled: boolean;
  started_at: string;
  ended_at: string | null;
}

export interface KeyBundle {
  user_id: string;
  identity_public_key: string;
  signed_pre_key: string;
  one_time_pre_keys: string[];
}
