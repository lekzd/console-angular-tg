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
      selectedFg="black"
      selectedBg="#007700"
      [padding]="{left: 1, top: 0, right: 1, bottom: 0}"
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
      const strings = this.getMessageStrings(newMessage, user);

      strings.forEach(item => {
        list.addItem(item);
      });

      list.down(strings.length);
      list.render();
    });
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    const parts = [
      date.getHours(),
      date.getMinutes()
    ].map(s => (s.toString() as any).padStart(2, '0'));

    return `{#008080-fg}${parts.join(':')}{/}`;
  }

  private formatUser(user: IUser | undefined, nameColor: string): string {
    if (user === undefined) {
      // in channels, authors goes without user ID
      return ``;
    }

    if (user.username && user.first_name && user.last_name) {
      return `{#0087d7-fg}@${user.username}{/} {${nameColor}}${user.first_name} ${user.last_name}{/}`;
    }

    if (user.first_name && user.last_name) {
      return `{${nameColor}}${user.first_name} ${user.last_name}{/}`;
    }

    if (user.username && user.first_name) {
      return `{#0087d7-fg}@${user.username}{/} {${nameColor}}${user.first_name}{/}`;
    }

    if (user.first_name) {
      return `{${nameColor}}${user.first_name}{/}`;
    }

    if (user.username) {
      return `{#0087d7-fg}@${user.username}{/}`;
    }

    return `{${nameColor}}[unknown user]{/}`;
  }

  private getMessageFirstString(message: IMessage, user: IUser | undefined): string {
    const nameColor = message.is_outgoing ? `#00ff00-fg` : `#af005f-fg`;
    const direction = message.is_outgoing ? `{${nameColor}}{bold}➜{/}{/}` : `{${nameColor}}{bold}←{/}{/}`;

    switch (message.content['@type']) {
      case 'messageText':
        return `${direction} ${this.formatDate(message.date)} ${this.formatUser(user, nameColor)}`;
      case 'messageSticker':
        return `${direction} ${this.formatDate(message.date)} ${this.formatUser(user, nameColor)}: {#008080-fg}[sticker ${message.content.sticker.emoji} ]{/}`;
      case 'messageAnimation':
        return `${direction} ${this.formatDate(message.date)} ${this.formatUser(user, nameColor)}: {#008080-fg}[animation ${message.content.caption.text || message.content.animation.file_name}]{/}`;
      case 'messageChatAddMembers':
        return `${direction} ${this.formatDate(message.date)} ${this.formatUser(user, nameColor)} {#008080-fg}joined chat{/}`;
      case 'messageChatJoinByLink':
        return `${direction} ${this.formatDate(message.date)} ${this.formatUser(user, nameColor)} {#008080-fg}joined by invite link{/}`;
      default:
        return `${direction} ${this.formatDate(message.date)} ${this.formatUser(user, nameColor)}: {#008080-fg}[${message.content['@type']}]{/}`;
    }
  }

  private wordWrappedFormattedTextStrings(text: string): string[] {
    const strings = [];
    const max = 60;
    let end = 0;
    let counter = 0;

    for (let i = 0; i < text.length; i++) {
      if (text === '↵') {
        strings.push(text.substring(end, i).trim());
        end = i + 1;
        counter = 0;

        continue;
      }

      if (counter >= max) {
        strings.push(text.substring(end, i).trim());
        end = i;
        counter = 0;

        continue;
      }

      counter++;
    }

    strings.push(text.substring(end).trim());

    return strings;
  }

  private getMessageContentString(message: IMessage, user: IUser | undefined): string[] | null {
    switch (message.content['@type']) {
      case 'messageText':
        return this.wordWrappedFormattedTextStrings(message.content.text.text);
      default:
        return null;
    }
  }

  private getMessageStrings(message: IMessage, author: IUser | undefined): string[] {
    const result = [];

    const first = this.getMessageFirstString(message, author);
    const rest = this.getMessageContentString(message, author);

    result.push(first);

    if (rest) {
      result.push(...rest);
    }

    return result;
  }

  private async openSelectedChat() {
    if (this.selectedChat$.value) {
      const messages = await this.conversationsService.loadConversationMessages(this.selectedChat$.value.id);
      const users = await this.tgClient.getMessagesAuthors(messages);
      const strings = [];

      messages.forEach(message => {
        const author = users.find(user => user.id === message.sender_user_id);

        strings.push(...this.getMessageStrings(message, author));
      });

      this.messages$.next(strings);

      setTimeout(() => {
        const list = this.appService.chatRef.element;

        list.select(strings.length - 1);
        list.scrollTo(strings.length);
      });
    }
  }
}
