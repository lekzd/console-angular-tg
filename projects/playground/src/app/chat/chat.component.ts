import {ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {TgClient} from '../../tg/tgClient';
import {BehaviorSubject} from 'rxjs';
import {Widgets} from 'blessed';
import {IChatFullData, IMessage, IUser} from '../../tg/tgInterfaces';
import {AppService} from '../app.service';
import {ConversationsService} from '../conversations/conversations.service';
import {ChatService} from './chat.service';
import {multiParagraphWordWrap, escapeFormattingTags} from './textUtils';
import { UsersService } from './users.service';
import { colors, fg, bg, defaultStyles } from '../colors';
import { filter } from 'rxjs/operators';

type IElementRef<T> = ElementRef<{element: T}>;

@Component({
  selector: 'pl-chat',
  template: `
    <list
      border="line"
      [scrollbar]="true"
      [label]="title$ | async"
      selectedFg="#808000"
      selectedBg="${colors.highlight}"
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

  elementStyle = defaultStyles();

  @ViewChild('messagesList', {static: true})
  set setChatElement(ref: IElementRef<Widgets.ListElement>) {
    this.appService.chatRef = ref.nativeElement;
  }

  private selectedChat$ = new BehaviorSubject<IChatFullData>(null);

  constructor(
    private tgClient: TgClient,
    public appService: AppService,
    private chatService: ChatService,
    private usersService: UsersService,
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

    this.chatService.messages$
      .pipe(filter(newMessage => !!newMessage))
      .subscribe(async newMessage => {
        const user = newMessage.sender_user_id
          ? await this.usersService.getUser(newMessage.sender_user_id)
          : null;

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

    return `{${fg(colors.fg10)}}${parts.join(':')}{/}`;
  }

  private formatUser(user: IUser | undefined, nameColor: string): string {
    if (!user) {
      // in channels, authors goes without user ID
      return ``;
    }

    if (user.username && user.first_name && user.last_name) {
      return `{${fg(colors.fg10)}}@${user.username}{/} {${nameColor}}${user.first_name} ${user.last_name}{/}`;
    }

    if (user.first_name && user.last_name) {
      return `{${nameColor}}${user.first_name} ${user.last_name}{/}`;
    }

    if (user.username && user.first_name) {
      return `{${fg(colors.fg10)}}@${user.username}{/} {${nameColor}}${user.first_name}{/}`;
    }

    if (user.first_name) {
      return `{${nameColor}}${user.first_name}{/}`;
    }

    if (user.username) {
      return `{${fg(colors.fg10)}}@${user.username}{/}`;
    }

    return `{${nameColor}}[unknown user]{/}`;
  }

  private getMessageFirstString(message: IMessage, user: IUser | undefined): string {
    const nameColor = message.is_outgoing ? fg(colors.fg12) : fg(colors.fg9);
    const direction = message.is_outgoing ? `{${nameColor}}{bold}⇢{/}{/}` : `{${nameColor}}{bold}⇠{/}{/}`;
    const date = this.formatDate(message.date);
    const author = this.formatUser(user, nameColor);

    switch (message.content['@type']) {
      case 'messageText':
        return `${direction} ${date} ${author}`;
      case 'messagePoll':
        return `${direction} ${date} ${author} {${fg(colors.fg11)}}poll:{/}`;
      case 'messageSticker':
        return `${direction} ${date} ${author}: {${fg(colors.fg11)}}[sticker ${message.content.sticker.emoji} ]{/}`;
      case 'messageAnimation':
        return `${direction} ${date} ${author}: {${fg(colors.fg11)}}[animation ${message.content.animation.file_name}]{/}`;
      case 'messageChatAddMembers':
        return `${direction} ${date} ${author} {${fg(colors.fg11)}}joined chat{/}`;
      case 'messageChatJoinByLink':
        return `${direction} ${date} ${author} {${fg(colors.fg11)}}joined by invite link{/}`;
      default:
        return `${direction} ${date} ${author}: {${fg(colors.fg11)}}[${message.content['@type']}]{/}`;
    }
  }

  private getRepliedmessageString(message: IMessage): string {
    if (!message.reply_to_message_id) {
      return;
    }

    const id = message.reply_to_message_id;
    const repliedMessage = this.conversationsService.getLocalMessage(message.chat_id, id);

    if (!repliedMessage) {
      return;
    }

    const content = this.getMessageContentString(repliedMessage) || ['<no message found>'];

    return `{${fg(colors.fg11)}}>>> ${content[0]}{/}`;
  }

  private getMessageContentString(message: IMessage): string[] | null {
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
    const reply = message.reply_to_message_id
      ? this.getRepliedmessageString(message)
      : null;
    const rest = this.getMessageContentString(message);

    result.push(first);

    if (reply) {
      result.push(reply);
    }

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

    this.messages$.next([]);

    const messages = await this.conversationsService.loadConversationMessages(chat);
    const users = await this.usersService.getMessagesAuthors(messages);
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
