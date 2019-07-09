import {ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {TgClient} from '../../tbClient';
import {BehaviorSubject} from 'rxjs';
import {Widgets} from 'blessed';
import {IChatFullData} from '../../tgInterfaces';
import {AppService} from '../app.service';
import {ConversationsService} from './conversations.service';

type IElementRef<T> = ElementRef<{element: T}>;

@Component({
  selector: 'pl-conversations',
  template: `
    <list
      border="line"
      [scrollbar]="true"
      [top]="0"
      [left]="0"
      [bottom]="2"
      [width]="appService.listColSpan$ | async"
      label="Chats"
      selectedFg="white-fg"
      selectedBg="#007700"
      [keys]="true"
      [tags]="true"
      #list
      [style]="elementStyle"
      [items]="chats$ | async">
    </list>

  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConversationsComponent implements OnInit {

  chats$ = new BehaviorSubject<string[]>([]);

  elementStyle = {
    bg: 'black-bg',
    focus: {
      border: {
        fg: 'blue',
        bg: 'black-bg',
      },
    },
    border: {
      fg: 'blue',
      bg: 'black-bg',
    },
    scrollbar: {
      bg: 'blue',
      fg: 'red',
    },
  };

  @ViewChild('list', {static: true})
  set setChatElement(ref: IElementRef<Widgets.ListElement>) {
    this.appService.listRef = ref.nativeElement;
  }

  constructor(
    private tgClient: TgClient,
    public appService: AppService,
    public conversationsService: ConversationsService,
  ) {
    this.conversationsService.loadChats();

    this.conversationsService.all$.subscribe(chatsData => {
      this.chats$.next(this.generateTable(chatsData));

      if (this.appService.listRef && this.appService.listRef.element) {
        this.appService.listRef.element.render();
      }
    });
    //
    // merge(
    //   fromPromise(this.tgClient.getChats()),
    //   // interval(30000)
    // )
    //   .pipe(switchMap(() => fromPromise(this.tgClient.getChats())))
    //   .subscribe(chatsData => {
    //     this.conversationsService.all$.next(chatsData);
    //     this.chats$.next(this.generateTable(chatsData));
    //   });
  }

  ngOnInit() {

  }

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
}
