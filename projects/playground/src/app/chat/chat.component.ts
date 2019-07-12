import {ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {TgClient} from '../../tbClient';
import {BehaviorSubject} from 'rxjs';
import {Widgets} from 'blessed';
import {IChatFullData, IMessage, IUser} from '../../tgInterfaces';
import {AppService} from '../app.service';
import {ConversationsService} from '../conversations/conversations.service';
import {ChatService} from './chat.service';
import {multiParagraphWordWrap, escapeFormattingTags} from './textUtils';

type IElementRef<T> = ElementRef<{element: T}>;

@Component({
  selector: 'pl-chat',
  template: `
    <list
      border="line"
      [scrollbar]="true"
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
    fg: 'white',
    focus: {
      border: {
        fg: 'blue',
      },
    },
    border: {
      fg: 'grey',
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
    this.chatService.current$.subscribe(async (chat: IChatFullData) => {
      if (!chat) {
        return;
      }

      if (this.selectedChat$.value) {
        this.tgClient.closeChat(this.selectedChat$.value.id);
      }

      this.selectedChat$.next(chat);
      await this.tgClient.openChat(chat.id);
      // this.tgClient.readAllChatMentions(chat.id);
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
      case 'messagePoll':
          return `${direction} ${this.formatDate(message.date)} ${this.formatUser(user, nameColor)} {#008080-fg}poll:{/}`;
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

  private getMessageContentString(message: IMessage, user: IUser | undefined): string[] | null {
    switch (message.content['@type']) {
      case 'messageText':
        return multiParagraphWordWrap(escapeFormattingTags(message.content.text.text), 50, '\n');
      case 'messagePhoto':
      case 'messageVideo':
      case 'messageAnimation':
      case 'messageAudio':
      case 'messageDocument':
        return multiParagraphWordWrap(escapeFormattingTags(message.content.caption.text), 50, '\n');
      case 'messagePoll':
        const question = multiParagraphWordWrap(escapeFormattingTags(message.content.poll.question), 50, '\n');

        return [...question, ...message.content.poll.options.map(option => `${option.text}: ${option.vote_percentage}%`)]
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

  private async readSelectedChatMessages(messages: IMessage[]) {
    const chat = this.selectedChat$.value;
    const messageIds = [];

    if (!chat) {
      return;
    }

    for (let i = messages.length - 1; i > 0; i--) {
      messageIds.push(messages[i].id);

      if (chat.last_read_inbox_message_id === messages[i].id) {
        break;
      }
    }

    await this.tgClient.readChatMessages(chat.id, messageIds);
  }

  private async openSelectedChat() {
    const chat = this.selectedChat$.value;

    if (!chat) {
      return;
    }
  
    const messages = await this.conversationsService.loadConversationMessages(chat.id);
    const users = await this.tgClient.getMessagesAuthors(messages);
    const strings = [];

    messages.forEach(message => {
      const author = users.find(user => user.id === message.sender_user_id);

      strings.push(...this.getMessageStrings(message, author));
    });

    this.messages$.next(strings);
    this.readSelectedChatMessages(messages);

    setTimeout(() => {
      const list = this.appService.chatRef.element;

      list.select(strings.length - 1);
      list.scrollTo(strings.length);
    });
  }
}
