import { Component, OnInit, ChangeDetectionStrategy, ViewChild, ElementRef } from '@angular/core';
import { Widgets } from 'blessed';
import { AppService } from '../app.service';
import { ChatService } from '../chat/chat.service';
import { TgClient } from '../../tg/tgClient';
import { colors, fg, bg, defaultStyles } from '../colors';

type IElementRef<T> = ElementRef<{element: T}>;

@Component({
  selector: 'pl-input',
  template: `
    <textbox
      border="line"
      [padding]="{left: 1}"
      [inputOnFocus]="true"
      [keys]="true"
      (submit)="onSubmit($event)"
      #textBox
      [style]="elementStyle"
    >
    </textbox>

  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputComponent implements OnInit {

  elementStyle = defaultStyles();

  @ViewChild('textBox', {static: true})
  set setInputElement(ref: IElementRef<Widgets.TextboxElement>) {
    this.appService.inputRef = ref.nativeElement;
  }

  constructor(
    private appService: AppService,
    private chatService: ChatService,
    private tgClient: TgClient,
  ) {}

  ngOnInit() {

  }

  async onSubmit(text: string) {
    const chat = this.chatService.current$.value;

    if (!chat || chat.type.is_channel) {
      return;
    }

    await this.tgClient.sendTextMessage(text, chat.id);

    this.appService.inputRef.element.clearValue();
    this.appService.reRender();
  }

}
