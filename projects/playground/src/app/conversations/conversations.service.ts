import {Injectable} from '@angular/core';
import {IChatFullData, IMessage, IUpdateChatLastMessageEvent, IUpdateChatOrderEvent, IUpdateNewMessageEvent, IUpdateChatReadInboxEvent} from '../../tg/tgInterfaces';
import {BehaviorSubject} from 'rxjs';
import {TgClient} from '../../tg/tgClient';
import {debounceTime, filter} from 'rxjs/internal/operators';

@Injectable()
export class ConversationsService {
  private storage = new Map<number, IMessage[]>();
  all$ = new BehaviorSubject<IChatFullData[]>([]);
  mutateChatList$ = new BehaviorSubject<IChatFullData[]>([]);

  constructor(private tgClient: TgClient) {
    this.tgClient.updates$
      .pipe(filter<IUpdateChatLastMessageEvent>(update => update['@type'] === 'updateChatLastMessage' && !!update.last_message))
      .subscribe(({chat_id, last_message}) => {
        // after new message sent to chat by user we got 2 messages with different ids but first of the with sending_state object
        if (!last_message.sending_state) {
          this.tryAddMessageToStorage(chat_id, last_message);
          this.changeChatLastMessage(chat_id, last_message);
        }
      });

    this.tgClient.updates$
      .pipe(filter<IUpdateChatOrderEvent>(update => update['@type'] === 'updateChatOrder'))
      .subscribe(({chat_id, order}) => {
        this.changeChatOrder(chat_id, order);
      });

    this.tgClient.updates$
      .pipe(filter<IUpdateNewMessageEvent>(update => update['@type'] === 'updateNewMessage' && !!update.message))
      .subscribe(({message}) => {
        if (!message.sending_state) {
          this.tryAddMessageToStorage(message.chat_id, message);
        }
      });

    this.tgClient.updates$
      .pipe(filter<IUpdateChatReadInboxEvent>(update => update['@type'] === 'updateChatReadInbox'))
      .subscribe(({chat_id, unread_count, last_read_inbox_message_id}) => {
        this.changeChatUnreadCount(chat_id, unread_count, last_read_inbox_message_id);
      });

    /* this.all$.subscribe(chats => {
      chats.forEach(chatData => {
        if (chatData.last_message) {
          this.tryAddMessageToStorage(chatData.id, chatData.last_message);
        }
      });
    } );*/

    this.mutateChatList$
      .pipe(
        debounceTime(1000),
      )
      .subscribe(chats => {
        this.all$.next(chats);
      });
  }

  private changeChatUnreadCount(chat_id: number, unread_count: number, last_read_inbox_message_id: number) {
    const chatToUpdate = this.all$.value.find(chat => chat.id === chat_id);

    if (!chatToUpdate) {
      return;
    }

    chatToUpdate.last_read_inbox_message_id = last_read_inbox_message_id;
    chatToUpdate.unread_count = unread_count;

    this.mutateChatList$.next([...this.all$.value]);
  }

  private changeChatLastMessage(chat_id: number, last_message: IMessage) {
    const chatToUpdate = this.all$.value.find(chat => chat.id === chat_id);

    if (!chatToUpdate) {
      return;
    }

    chatToUpdate.last_message = last_message;

    this.all$.next([...this.all$.value].sort((a, b) => a.last_message.date < b.last_message.date ? 1 : -1));
  }

  private changeChatOrder(chat_id: number, order: string) {
    const chatToUpdate = this.all$.value.find(chat => chat.id === chat_id);

    if (!chatToUpdate) {
      return;
    }

    chatToUpdate.order = order;

    this.mutateChatList$.next([...this.all$.value].sort((a, b) => a.order < b.order ? 1 : -1));
  }

  private tryAddMessageToStorage(chatId: number, newMessage: IMessage) {
    if (!this.storage.has(chatId)) {
      this.storage.set(chatId, []);
    }

    const messages = this.storage.get(chatId);

    if (messages.some(message => message.id === newMessage.id)) {
      return;
    }

    messages.push(newMessage);
    messages.sort((a, b) => a.date > b.date ? 1 : -1);
  }

  async loadChats(): Promise<IChatFullData[]> {
    return this.tgClient.getChats()
      .then(chats => {
        this.all$.next(chats);

        return chats;
      });
  }

  async loadConversationMessages(chat: IChatFullData): Promise<IMessage[]> {
    const chatId = chat.id;
    const cachedMessages = this.storage.get(chatId) || [];

    if (cachedMessages.length < 25) {
      await this.tgClient.getChatLastMessages(chat)
        .catch(() => [])
        .then(messages => {
          messages.forEach(message => {
            this.tryAddMessageToStorage(chatId, message);
          });

          return messages;
        });

      return this.storage.get(chatId);
    }

    return cachedMessages;
  }

  getLocalMessage(chatId: number, messageId: number): IMessage {
    const messages = this.storage.get(chatId) || [];

    return messages.find(({id}) => messageId === id);
  }

}
