import {ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, Renderer2, ViewChild} from "@angular/core";
import {TgClient} from '../tbClient';
import {BehaviorSubject, interval, merge, Subject} from 'rxjs';
import {switchMap, timeInterval, timeout, timeoutWith} from 'rxjs/internal/operators';
import {fromPromise} from 'rxjs/internal/observable/fromPromise';
import {Widgets} from "blessed";
import {IChatFullData, IMessage, IUser} from "../tgInterfaces";

@Component({
  selector: 'pl-root',
  template: `

    <grid rows="12" cols="12">
    <!--<pl-1-plain-text></pl-1-plain-text>-->
    <!--<pl-2-text-in-box></pl-2-text-in-box>-->
    <!--<pl-3-dashboard></pl-3-dashboard>-->
    <!--{{data}}-->

      <!--<table-->
        <!--[row]="0"-->
        <!--[col]="0"-->
        <!--[rowSpan]="11"-->
        <!--[colSpan]="6"-->
        <!--fg="green"-->
        <!--label="Chats"-->
        <!--selectedFg="white-fg"-->
        <!--selectedBg="#007700"-->
        <!--[interactive]="true"-->
        <!--[keys]="true"-->
        <!--[columnSpacing]="1"-->
        <!--[columnWidth]="[100]"-->
        <!--(action)="onSelect($event)"-->
        <!--[style]="{-->
          <!--focus: {-->
            <!--border: {-->
              <!--fg: 'blue'-->
            <!--}-->
          <!--}-->
        <!--}"-->
        <!--[data]="chats$ | async">-->
      <!--</table>-->

      <list
        [row]="0"
        [col]="0"
        [rowSpan]="11"
        [colSpan]="listColSpan$ | async"
        fg="green"
        label="Chats"
        selectedFg="white-fg"
        selectedBg="#007700"
        [keys]="true"
        [tags]="true"
        #list
        [style]="elementStyle"
        [items]="chats$ | async">
      </list>

      <list
        [row]="0"
        [col]="listColSpan$ | async"
        [rowSpan]="11"
        [colSpan]="messagesColSpan$ | async"
        fg="green"
        [label]="activeChatTitle$ | async"
        selectedFg="white-fg"
        selectedBg="#007700"
        [keys]="true"
        [tags]="true"
        #messagesList
        [style]="elementStyle"
        [items]="messages$ | async">
      </list>

      <!--<log-->
        <!--[row]="0"-->
        <!--[col]="6"-->
        <!--[rowSpan]="11"-->
        <!--[colSpan]="6"-->
        <!--fg="white"-->
        <!--label="Messages"-->
        <!--[logLines]="messages$ | async"-->
      <!--&gt;</log>-->

      <textbox
        [row]="11"
        [col]="0"
        [rowSpan]="2"
        [colSpan]="10"
        [inputOnFocus]="true"
        [keys]="true"
        [mouse]="true"
        #textBox
        [style]="elementStyle"
        fg="green"
      >
      </textbox>

    </grid>

    <box bottom="0"
         right="0"
         height="3"
         width="21"
         [style]="style">
      {{input$ | async}}
    </box>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {

  data = 'Loading...';
  allChats$ = new BehaviorSubject<IChatFullData[]>([]);
  chats$ = new BehaviorSubject<string[]>([]);
  keyPress$ = new Subject<string>();
  input$ = new BehaviorSubject<string>('');
  messages$ = new BehaviorSubject<string[]>(['11111', '2222']);
  activeChatTitle$ = new BehaviorSubject<string>('<--Выберите чат');

  messagesColSpan$ = new BehaviorSubject<number>(4);
  listColSpan$ = new BehaviorSubject<number>(8);

  style = {
    fg: 'white',
    bg: 'green',
    border: {
      fg: 'red',
    },
  };

  elementStyle = {
    focus: {
      border: {
        fg: 'blue',
      }
    },
    border: {
      fg: 'grey',
    },
  };

  @ViewChild('list', {static: true})
  listChild: ElementRef<Widgets.ListElement>;

  @ViewChild('messagesList', {static: true})
  messagesListRef: ElementRef<Widgets.ListElement>;

  @ViewChild('textBox', {static: true})
  textBoxRef: ElementRef<Widgets.ListElement>;

  private selectedChat: IChatFullData;

  // @HostListener('document:keypress', ['$event'])
  // onKeyPress(event: any) {
  //   if (event.char) {
  //     this.keyPress$.next(event.char);
  //   }
  // }

  onSelect(event: any) {}

  generateTable(chatsData: IChatFullData[]) {
    const chats = chatsData.slice(0, 100);

    const data = chats.map(chatFull => {
      const defaultStyle = `{${'#6c6c6c'}-fg}`;
      const accentStyles = chatFull.unread_count ? `{${'#00afff'}-fg}` : defaultStyle;
      const textStyles = chatFull.unread_count ? `{${'#00ff00'}-fg}` : defaultStyle;

      const unreadStr = `${(chatFull.unread_count.toString() as any).padEnd(5, ' ')}`;

      return `${accentStyles}${unreadStr}{/} ${textStyles}${chatFull.title}{/}`;
    });

    return data;
  }

  constructor(
    private tgClient: TgClient,
    private changeDetectorRef: ChangeDetectorRef,
    private renderer2: Renderer2,
  ) {
    merge(
      fromPromise(this.tgClient.getCharts()),
      interval(30000)
    )
      .pipe(switchMap(() => fromPromise(this.tgClient.getCharts())))
      .subscribe(chatsData => {
        this.allChats$.next(chatsData);
        this.chats$.next(this.generateTable(chatsData));

        this.changeDetectorRef.markForCheck();
      });

    this.renderer2.selectRootElement('').on('keypress', (key) => {
      if (key) {
        this.keyPress$.next(key);
      }
    });
  }

  ngOnInit() {
    this.keyPress$
      .subscribe(letter => {
        this.input$.next(this.input$.value + letter);
      });

    this.listChild.nativeElement.on('select item', (selectedItem) => {
      const selectedIndex = (selectedItem.parent as any).selected;

      this.selectedChat = this.allChats$.value[selectedIndex];
    });

    this.input$
      .subscribe(input => {
        if (input === 't') {
          this.input$.next('');

          this.openSelectedChat();
        }

        if (input === 'a') {
          this.input$.next('');

          this.focusList();
        }

        if (input === 'x') {
          this.input$.next('');

          this.focusTextBox();
        }

        if (input === 's') {
          this.input$.next('');

          this.focusChat();
        }

        if (input.length > 3) {
          this.input$.next('');
        }
      });

    // this.tgClient.getDialogs().then(data => {
    //
    //   debugger;
    // });
  }

  private formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const parts = [
      date.getHours(),
      date.getMinutes()
    ].map(s => (s.toString() as any).padStart(2, '0'));

    return parts.join(':');
  }

  private formatUser(user: IUser): string {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }

    if (user.username) {
      return `@${user.username}`;
    }

    return `[unknown user]`;
  }

  private getMessagesString(message: IMessage, user: IUser): string {
    switch (message.content['@type']) {
      case 'messageText':
        return `${this.formatDate(message.date)}> ${this.formatUser(user)}: ${message.content.text.text}`;
      default:
        return `${this.formatDate(message.date)}> ${this.formatUser(user)}: [${message.content['@type']}]`;
    }
  }

  private async openSelectedChat() {
    if (this.selectedChat) {
      this.activeChatTitle$.next(this.selectedChat.title);
      const [lastAuthor] = await this.tgClient.getMessagesAuthors([this.selectedChat.last_message]);
      this.messages$.next([
        '...loading...',
        this.getMessagesString(this.selectedChat.last_message, lastAuthor)
      ]);

      const messages = await this.tgClient.getMessages(this.selectedChat);
      const users = await this.tgClient.getMessagesAuthors(messages);
      const strings = messages.reverse().map(message => {
        return this.getMessagesString(message, users.find(user => user.id === message.sender_user_id));
      });

      setTimeout(() => {
        const list = (this.messagesListRef.nativeElement as any).element;

        list.select(strings.length - 1);
        list.scrollTo(strings.length - 1);
      });

      this.messages$.next(strings);

      debugger;
    }
  }

  private focusChat() {
    const list = (this.messagesListRef.nativeElement as any).element;

    this.listColSpan$.next(4);
    this.messagesColSpan$.next(8);

    list.focus();
  }

  private focusList() {
    const list = (this.listChild.nativeElement as any).element;

    this.listColSpan$.next(8);
    this.messagesColSpan$.next(4);

    list.focus();
  }

  private focusTextBox() {
    const list = (this.textBoxRef.nativeElement as any).element;

    this.listColSpan$.next(4);
    this.messagesColSpan$.next(8);

    list.focus();
  }
}
