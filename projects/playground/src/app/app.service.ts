import {Injectable} from '@angular/core';
import {BehaviorSubject, from} from 'rxjs';
import {Widgets} from 'blessed';
import {Modes} from './modes';

@Injectable()
export class AppService {
  mode$ = new BehaviorSubject<Modes>(Modes.conversations);
  messagesColSpan$ = new BehaviorSubject<string>('30%');
  listColSpan$ = new BehaviorSubject<string>('70%');

  chatRef: {element: Widgets.ListElement};
  inputRef: {element: Widgets.TextboxElement};
  listRef: {element: Widgets.ListElement};

  reRender() {
    this.chatRef.element.screen.render();
  }

  focusChat() {
    this.listColSpan$.next('20%');
    this.messagesColSpan$.next('80%');
    this.mode$.next(Modes.chat);

    this.chatRef.element.focus();
  }

  focusList() {
    this.listColSpan$.next('70%');
    this.messagesColSpan$.next('30%');
    this.mode$.next(Modes.conversations);

    this.listRef.element.focus();
  }

  focusTextBox() {
    this.inputRef.element.focus();
  }
}
