import {Injectable} from '@angular/core';
import {IChatFullData, IMessage} from '../../tgInterfaces';
import {BehaviorSubject, Subject} from 'rxjs';
import {TgClient} from '../../tbClient';
import {debounceTime, filter} from 'rxjs/internal/operators';

@Injectable()
export class ConversationsService {
  storage = new Map<number, IMessage[]>();
  all$ = new BehaviorSubject<IChatFullData[]>([]);
  mutateChatList$ = new Subject<IChatFullData[]>();

  constructor(private tgClient: TgClient) {
    this.tgClient.updates$
      .pipe(filter(update => update['@type'] === 'updateChatLastMessage' && !!update.last_message))
      .subscribe(({chat_id, last_message}) => {
        this.tryAddMessageToStorage(chat_id, last_message);
      });

    this.tgClient.updates$
      .pipe(filter(update => update['@type'] === 'updateNewMessage' && !!update.message))
      .subscribe(({chat_id, message}) => {
        this.tryAddMessageToStorage(chat_id, message);
      });

    this.tgClient.updates$
      .pipe(filter(update => update['@type'] === 'updateChatReadInbox'))
      .subscribe(({chat_id, unread_count, last_read_inbox_message_id}) => {
        const chatToUpdate = this.all$.value.find(chat => chat.id === chat_id);

        if (!chatToUpdate) {
          return;
        }

        chatToUpdate.last_read_inbox_message_id = last_read_inbox_message_id;
        chatToUpdate.unread_count = unread_count;

        this.mutateChatList$.next([...this.all$.value]);
      });

    this.all$.subscribe(chats => {
      chats.forEach(chatData => {
        if (chatData.last_message) {
          this.tryAddMessageToStorage(chatData.id, chatData.last_message);
        }
      });
    });

    this.mutateChatList$
      .pipe(
        debounceTime(1000),
      )
      .subscribe(chats => {
        this.all$.next(chats);
      });
  }

  private tryAddMessageToStorage(chatId: number, newMessage: IMessage) {
    if (!this.storage.has(chatId)) {
      this.storage.set(chatId, []);
    }

    const messages = this.storage.get(chatId);

    if (messages.find(message => message.id === newMessage.id)) {
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

  async loadConversationMessages(chatId: number): Promise<IMessage[]> {
    const cachedMessages = this.storage.get(chatId);

    if (cachedMessages.length < 50) {
      return this.tgClient.getMessages(chatId)
        .then(messages => {
          messages.forEach(message => {
            this.tryAddMessageToStorage(chatId, message);
          });

          return messages;
        });
    }

    return cachedMessages;
  }

}
