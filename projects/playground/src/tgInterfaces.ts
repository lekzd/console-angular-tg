
type IMessageContent = IMessageTextContent;

export interface IMessageTextContent {
  '@type': 'messageText';
  text: {
    '@type': 'formattedText';
    text: string;
  };
}

export interface IMessagesResponse {
  '@type': 'messages';
  messages: IMessage[];
  total_count: number;
}

export interface IMessage {
  '@type': 'message';
  id: number;
  sender_user_id: number;
  chat_id: number;
  is_outgoing: boolean;
  can_be_edited: boolean;
  can_be_forwarded: boolean;
  can_be_deleted_only_for_self: boolean;
  can_be_deleted_for_all_users: boolean;
  is_channel_post: boolean;
  contains_unread_mention: boolean;
  date: number;
  edit_date: boolean;
  reply_to_message_id: boolean;
  ttl: number;
  ttl_expires_in: number;
  via_bot_user_id: number;
  author_signature: string;
  views: number;
  media_album_id: string;
  content: IMessageContent;
}

type IChatType = IChatTypeSuperGroup;

interface IChatTypeSuperGroup {
  '@type': 'chatTypeSupergroup';
  supergroup_id: number;
  is_channel: boolean;
}

export interface IChatFullData {
  '@type': 'chat';
  id: number;
  type: IChatType;
  title: string;
  photo: any;
  last_message: IMessage;
  order: string;
  is_pinned: boolean;
  is_marked_as_unread: boolean;
  is_sponsored: boolean;
  can_be_deleted_only_for_self: boolean;
  can_be_deleted_for; _all_users: boolean;
  can_be_reported: boolean;
  default_disable_notification: boolean;
  unread_count: number;
  last_read_inbox_message_id: number;
  last_read_outbox_message_id: number;
  unread_mention_count: number;
  notification_settings: any;
  pinned_message_id: number;
  reply_markup_message_id: number;
  client_data: string;
}

export interface IUserProfilePhoto {
  '@type': 'profilePhoto';
  'id': string;
  'small': {
    '@type': 'file';
    'id': 399;
    'size': 0;
    'expected_size': 0;
    'local': {
      '@type': 'localFile';
      'path': '';
      'can_be_downloaded': true;
      'can_be_deleted': false;
      'is_downloading_active': false;
      'is_downloading_completed': false;
      'download_offset': 0;
      'downloaded_prefix_size': 0;
      'downloaded_size': 0
    };
    'remote': {
      '@type': 'remoteFile';
      'id': 'AQADAgADqqgxG0JeAgAJeBJLDQAEKsVUPHnuZfLcbw0AAQI';
      'is_uploading_active': false;
      'is_uploading_completed': true;
      'uploaded_size': 0
    }
  };
  'big': {
    '@type': 'file';
    'id': 400;
    'size': 0;
    'expected_size': 0;
    'local': {
      '@type': 'localFile';
      'path': '';
      'can_be_downloaded': true;
      'can_be_deleted': false;
      'is_downloading_active': false;
      'is_downloading_completed': false;
      'download_offset': 0;
      'downloaded_prefix_size': 0;
      'downloaded_size': 0
    };
    'remote': {
      '@type': 'remoteFile';
      'id': 'AQADAgADqqgxG0JeAgAJeBJLDQAEDs6Mb3l5ZRPebw0AAQI';
      'is_uploading_active': false;
      'is_uploading_completed': true;
      'uploaded_size': 0
    }
  };
}

export interface IUser {
  '@type': 'user';
  id: number;
  'first_name': string;
  'last_name': string;
  'username': string;
  'phone_number': string;
  'status': {
    '@type': 'userStatusOffline' | 'userStatusOnline';
    'was_online': number
  };
  'profile_photo': IUserProfilePhoto;
  'outgoing_link': {
    '@type': 'linkStateNone'
  };
  'incoming_link': {
    '@type': 'linkStateNone'
  };
  'is_verified': boolean;
  'is_support': boolean;
  'restriction_reason': string;
  'have_access': boolean;
  'type': {
    '@type': 'userTypeRegular'
  };
  'language_code': string;
}
