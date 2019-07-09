import {Injectable} from '@angular/core';
import {BehaviorSubject, merge, Observable} from 'rxjs';
import {TgClient} from '../../tbClient';
import {IChatFullData, IMessage} from '../../tgInterfaces';
import {filter, map} from 'rxjs/internal/operators';

@Injectable()
export class ChatService {
  current$ = new BehaviorSubject<IChatFullData>(null);

  get chatLastMessageUpdate$(): Observable<IMessage> {
    return this.tgClient.updates$.pipe(
      filter(() => !!this.current$.value),
      filter(update => update['@type'] === 'updateChatLastMessage'),
      map(update => update.last_message),
    );
  }

  get newMessageUpdate$(): Observable<IMessage> {
    return this.tgClient.updates$.pipe(
      filter(() => !!this.current$.value),
      filter(update => update['@type'] === 'updateNewMessage'),
      filter(update => update.message.chat_id === this.current$.value.id),
      map(update => update.message),
    );
  }

  messages$ = merge(
    // this.chatLastMessageUpdate$,
    this.newMessageUpdate$,
  );

  constructor(private tgClient: TgClient) {}

}
