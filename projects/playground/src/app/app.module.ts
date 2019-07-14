import { NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TerminalModule } from 'platform-terminal';

import { AppComponent } from './app.component';
import {TgClient} from '../tg/tgClient';
import {ChatComponent} from './chat/chat.component';
import {AppService} from './app.service';
import {ConversationsComponent} from './conversations/conversations.component';
import {ConversationsService} from './conversations/conversations.service';
import {ChatService} from './chat/chat.service';
import {UsersService} from './chat/users.service';
import { InputComponent } from './input/input.component';

@NgModule({
  declarations: [
    AppComponent,
    ChatComponent,
    InputComponent,
    ConversationsComponent,
  ],
  imports: [
    TerminalModule,
    CommonModule,
  ],
  providers: [
    AppService,
    ChatService,
    UsersService,
    ConversationsService,
    TgClient,
  ],
  bootstrap: [AppComponent],
  schemas: [NO_ERRORS_SCHEMA],
})
export class AppModule {
}
