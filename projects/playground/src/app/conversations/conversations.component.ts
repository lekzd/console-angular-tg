import {ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {TgClient} from '../../tbClient';
import {BehaviorSubject, merge} from 'rxjs';
import {Widgets} from 'blessed';
import {IChatFullData} from '../../tgInterfaces';
import {AppService} from '../app.service';
import {ConversationsService} from './conversations.service';
import { filter, map } from 'rxjs/operators';
import { colors, fg, bg, defaultStyles } from '../colors';

type IElementRef<T> = ElementRef<{element: T}>;

const color_default = fg(colors.fg);
const color_unread = fg(colors.fg12);
const color_counter_unread = fg(colors.fg10);

@Component({
  selector: 'pl-conversations',
  template: `
    <list
      border="line"
      [scrollbar]="true"
      [label]="connectionState$ | async"
      selectedFg="black"
      selectedBg="${colors.highlight}-fg"
      [padding]="{left: 1, top: 0, right: 1, bottom: 0}"
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

  connectionState$ = merge(
    this.tgClient.updates$
      .pipe(
        filter(event => event['@type'] === 'updateConnectionState'),
        map(event => event['@type']),
      )
  );

  elementStyle = defaultStyles();

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

      setTimeout(() => {
        if (this.appService.listRef && this.appService.listRef.element) {
          this.appService.listRef.element.screen.render();
        }
      }, 1000);
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
      const defaultStyle = `{${color_default}}`;
      const accentStyles = chatFull.unread_count ? `{${color_counter_unread}}` : defaultStyle;
      const textStyles = chatFull.unread_count ? `{${color_unread}}` : defaultStyle;

      const unreadStr = `${(chatFull.unread_count.toString() as any).padEnd(5, ' ')}`;

      return `${accentStyles}${unreadStr}{/} ${textStyles}${chatFull.title}{/}`;
    });

    return data;
  }
}
