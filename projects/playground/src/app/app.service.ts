import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {Widgets} from 'blessed';

@Injectable()
export class AppService {
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

    this.chatRef.element.focus();
  }

  focusList() {
    this.listColSpan$.next('70%');
    this.messagesColSpan$.next('30%');

    this.listRef.element.focus();
  }

  focusTextBox() {
    this.listColSpan$.next('20%');
    this.messagesColSpan$.next('80%');

    this.inputRef.element.focus();
  }
}
