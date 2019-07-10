import {ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {TgClient} from '../../tbClient';
import {BehaviorSubject, merge} from 'rxjs';
import {Widgets} from 'blessed';
import {IChatFullData} from '../../tgInterfaces';
import {AppService} from '../app.service';
import {ConversationsService} from './conversations.service';
import { filter, map } from 'rxjs/operators';

type IElementRef<T> = ElementRef<{element: T}>;

@Component({
  selector: 'pl-conversations',
  template: `
    <list
      border="line"
      [scrollbar]="true"
      [label]="connectionState$ | async"
      selectedFg="black"
      selectedBg="#007700"
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
      });
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
