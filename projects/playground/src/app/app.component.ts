import {ChangeDetectionStrategy, Component, ElementRef, OnInit, Renderer2, ViewChild} from '@angular/core';
import {TgClient} from '../tbClient';
import {BehaviorSubject, merge, Subject} from 'rxjs';
import {Widgets} from 'blessed';
import {AppService} from './app.service';
import {ConversationsService} from './conversations/conversations.service';
import {ChatService} from './chat/chat.service';

type IElementRef<T> = ElementRef<{element: T}>;

@Component({
  selector: 'pl-root',
  template: `
    <pl-conversations
      [style]="{transparent: true}"
      [top]="0"
      [left]="0"
      [bottom]="2"
      [width]="appService.listColSpan$ | async"
      >
    </pl-conversations>
    <pl-chat
      [style]="{transparent: true}"
      [top]="0"
      [left]="appService.listColSpan$ | async"
      [bottom]="2"
      [width]="appService.messagesColSpan$ | async"
    >
    </pl-chat>

    <pl-input
      [left]="0"
      [bottom]="0"
      [right]="20"
      [height]="3"
    >
    </pl-input>

    <box [bottom]="0"
         [right]="0"
         [height]="2"
         [width]="20"
         [content]=""
         [style]="style">
    </box>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit {

  data = 'Loading...';
  keyPress$ = new Subject<string>();
  input$ = new BehaviorSubject<string>('');

  updatesCount = 0;

  style = {
    fg: 'white',
    bg: 'green',
    border: {
      fg: 'red',
    },
  };

  private selectedIndex = 0;

  constructor(
    private tgClient: TgClient,
    private renderer2: Renderer2,
    public appService: AppService,
    public chatService: ChatService,
    private conversationsService: ConversationsService,
  ) {

    this.renderer2.data.root.on('keypress', (key) => {
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

    setTimeout(() => {
      this.appService.focusList();
      this.appService.listRef.element.on('select item', (selectedItem) => {
        this.selectedIndex = (selectedItem.parent as any).selected;
      });
    }, 1000);

    const commands = {
      't': () => {
        const chat = this.conversationsService.all$.value[this.selectedIndex];
        this.chatService.current$.next(chat);
      },
      'е': () => {
        const chat = this.conversationsService.all$.value[this.selectedIndex];
        this.chatService.current$.next(chat);
      },
      'a': () => {
        this.appService.focusList();
      },
      'ф': () => {
        this.appService.focusList();
      },
      's': () => {
        this.appService.focusTextBox();
      },
      'ы': () => {
        this.appService.focusTextBox();
      },
      'd': () => {
        this.appService.focusChat();
      },
      'в': () => {
        this.appService.focusChat();
      },
      'r': () => {
        this.appService.reRender();
      },
      'к': () => {
        this.appService.reRender();
      }
    };

    this.input$
      .subscribe(input => {
        if (!input) {
          return;
        }

        const matched = Object.keys(commands).some(key => key.startsWith(input));

        if (!matched) {
          this.input$.next('');
        }

        if (commands.hasOwnProperty(input)) {
          commands[input]();

          this.input$.next('');
        }
      });
  }
}
