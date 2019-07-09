import {ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {TgClient} from '../../tbClient';
import {BehaviorSubject} from 'rxjs';
import {Widgets} from 'blessed';
import {IChatFullData, IMessage, IUser} from '../../tgInterfaces';
import {AppService} from '../app.service';
import {ConversationsService} from '../conversations/conversations.service';
import {ChatService} from './chat.service';

type IElementRef<T> = ElementRef<{element: T}>;

@Component({
  selector: 'pl-chat',
  template: `
    <list
      border="line"
      [scrollbar]="true"
      [top]="0"
      [left]="appService.listColSpan$ | async"
      [bottom]="2"
      [width]="appService.messagesColSpan$ | async"
      [label]="title$ | async"
      selectedFg="white-fg"
      selectedBg="#007700"
      [keys]="true"
      [tags]="true"
      #messagesList
      [style]="elementStyle"
      [items]="messages$ | async">
    </list>

  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatComponent implements OnInit {

  messages$ = new BehaviorSubject<string[]>([]);
  title$ = new BehaviorSubject<string>('<--Выберите чат');

  elementStyle = {
    bg: 'black-bg',
    focus: {
      border: {
        fg: 'blue',
        bg: 'black-bg',
      },
    },
    border: {
      fg: 'grey',
      bg: 'black-bg',
    },
    scrollbar: {
      bg: 'blue',
      fg: 'red',
    },
  };

  @ViewChild('messagesList', {static: true})
  set setChatElement(ref: IElementRef<Widgets.ListElement>) {
    this.appService.chatRef = ref.nativeElement;
  }

  private selectedChat$ = new BehaviorSubject<IChatFullData>(null);

  constructor(
    private tgClient: TgClient,
    public appService: AppService,
    private chatService: ChatService,
    private conversationsService: ConversationsService,
  ) {}

  ngOnInit() {
    this.chatService.current$.subscribe((chat: IChatFullData) => {
      if (!chat) {
        return;
      }

      if (this.selectedChat$.value) {
        this.tgClient.closeChat(this.selectedChat$.value.id);
      }

      this.selectedChat$.next(chat);
      this.tgClient.openChat(chat.id);
      this.openSelectedChat();
      this.title$.next(chat.title);

      this.appService.chatRef.element.render();
    });

    this.chatService.messages$.subscribe(async newMessage => {
      if (!newMessage) {
        return;
      }

      const [user] = await this.tgClient.getMessagesAuthors([newMessage]);
      const list = this.appService.chatRef.element;

      list.addItem(this.getMessagesString(newMessage, user));
      list.down(1);
      list.render();
    });
  }

  private formatDate(timestamp: number): string {
    const date = new Date(Date.now() - timestamp);
    const parts = [
      date.getHours(),
      date.getMinutes()
    ].map(s => (s.toString() as any).padStart(2, '0'));

    return `{#767676-fg}${parts.join(':')}{/}`;
  }

  private formatUser(user: IUser | undefined): string {
    if (user === undefined) {
      return `{#767676-fg}[bot]{/}`;
    }

    if (user.first_name && user.last_name) {
      return `{#767676-fg}${user.first_name} ${user.last_name}{/}`;
    }

    if (user.username) {
      return `{#767676-fg}@${user.username}{/}`;
    }

    return `{#767676-fg}[unknown user]{/}`;
  }

  private getMessagesString(message: IMessage, user: IUser | undefined): string {
    switch (message.content['@type']) {
      case 'messageText':
        return `${this.formatDate(message.date)} ${this.formatUser(user)}: ${message.content.text.text}`;
      case 'messageSticker':
        return `${this.formatDate(message.date)} ${this.formatUser(user)}: {#767676-fg}[sticker ${message.content.sticker.emoji} ]{/}`;
      default:
        return `${this.formatDate(message.date)} ${this.formatUser(user)}: {#767676-fg}[${message.content['@type']}]{/}`;
    }
  }

  private async openSelectedChat() {
    if (this.selectedChat$.value) {
      const messages = await this.conversationsService.loadConversationMessages(this.selectedChat$.value.id);
      const users = await this.tgClient.getMessagesAuthors(messages);

      const strings = messages.map(message => {
        return this.getMessagesString(message, users.find(user => user.id === message.sender_user_id));
      });

      // const [lastAuthor] = await this.tgClient.getMessagesAuthors([this.selectedChat$.value.last_message]);
      // this.messages$.next([
      //   '...loading...',
      //   ...(await this.conversationsService.loadConversationMessages(this.selectedChat$.value.id))
      // ]);
      //
      // const messages = await this.tgClient.getMessages(this.selectedChat$.value.id);
      // const users = await this.tgClient.getMessagesAuthors(messages);
      // const strings = messages.reverse().map(message => {
      //   return this.getMessagesString(message, users.find(user => user.id === message.sender_user_id));
      // });

      const list = this.appService.chatRef.element;

      list.select(strings.length - 1);
      list.scrollTo(strings.length);

      this.messages$.next(strings);
    }
  }
}
