import {Injectable} from '@angular/core';
import {BehaviorSubject, merge, Observable} from 'rxjs';
import {TgClient} from '../../tbClient';
import {IChatFullData, IMessage, IUpdateNewMessageEvent} from '../../tgInterfaces';
import {filter, map} from 'rxjs/internal/operators';

@Injectable()
export class ChatService {
  current$ = new BehaviorSubject<IChatFullData>(null);

  get newMessageUpdate$(): Observable<IMessage> {
    return this.tgClient.updates$.pipe(
      filter(() => !!this.current$.value),
      filter<IUpdateNewMessageEvent>(update => update['@type'] === 'updateNewMessage'),
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
