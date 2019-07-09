import {ChangeDetectionStrategy, Component, ElementRef, OnInit, Renderer2, ViewChild} from '@angular/core';
import {TgClient} from '../tbClient';
import {BehaviorSubject, merge, Subject} from 'rxjs';
import {Widgets} from 'blessed';
import {IChatFullData, IUpdateConnectionStateEvent} from '../tgInterfaces';
import {AppService} from './app.service';
import {filter, map} from 'rxjs/internal/operators';
import {ConversationsService} from './conversations/conversations.service';
import {ChatService} from './chat/chat.service';

type IElementRef<T> = ElementRef<{element: T}>;

@Component({
  selector: 'pl-root',
  template: `
    <pl-conversations [style]="{transparent: true}"></pl-conversations>
    <pl-chat [style]="{transparent: true}"></pl-chat>

    <textbox
      border="line"
      [left]="0"
      [bottom]="0"
      [right]="20"
      [height]="3"
      [padding]="{left: 1}"
      [inputOnFocus]="true"
      [keys]="true"
      [mouse]="true"
      (submit)="onSubmit($event)"
      #textBox
      [style]="elementStyle"
    >
    </textbox>

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

  connectionState$ = merge(
    this.tgClient.updates$
      .pipe(
        // filter(event => event['@type'] === 'updateConnectionState')
        map(() => (this.updatesCount++).toString())
      )
  // ).pipe(map(event => event['@type']));
  );

  style = {
    fg: 'white',
    bg: 'green',
    border: {
      fg: 'red',
    },
  };

  elementStyle = {
    bg: 'black-bg',
    fg: 'grey',
    focus: {
      fg: 'white',
      border: {
        fg: 'blue',
        bg: 'black-bg',
      },
    },
    border: {
      fg: 'grey',
      bg: 'black-bg',
    },
  };

  @ViewChild('textBox', {static: true})
  set setInputElement(ref: IElementRef<Widgets.TextboxElement>) {
    this.appService.inputRef = ref.nativeElement;
  }

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

    // this.tgClient.updates$.pipe(
    //   filter(event => event['@type'] === 'updateChatLastMessage')
    // ).subscribe(update => {
    //   debugger;
    // });

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

    // this.tgClient.getDialogs().then(data => {
    //
    //   debugger;
    // });
  }

  onSubmit(event) {
    if (this.chatService.current$.value) {
      this.tgClient.sendTextMessage(event, this.chatService.current$.value.id)
        .then(() => {
          this.appService.inputRef.element.clearValue();
          this.appService.reRender();
        });
    }
  }
}