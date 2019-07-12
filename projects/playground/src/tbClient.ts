import {
  IChatFullData, IMessage, IMessagesResponse, IOkResponse, IUpdateConnectionStateEvent, IUpdateEvent, IUpdatesResponse,
  IUser,
  IUpdateOptionEvent
} from './tgInterfaces';
const readline = require('readline');
import {Injectable} from '@angular/core';
import {config} from 'dotenv';
import {Structs} from 'tglib';
import {Subject} from 'rxjs';
import {filter} from 'rxjs/internal/operators';
import * as path from 'path';
const { Client } = require('tglib/node');

const env = config().parsed;
//
const makeReadLine = (question): Promise<string> => new Promise(resolve => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

rl.question(question + ' ', answer => {
  resolve(answer);
rl.close();
});
});

let client: any = null;

export async function tgClientInit() {
  client = new Client({
    apiId: env.APP_ID,
    apiHash: env.API_HASH,
  });

  // Save tglib default handler which prompt input at console
  const defaultHandler = client.callbacks['td:getInput'];

  // Register own callback for returning auth details
  client.registerCallback('td:getInput', async (args) => {
    if (args.string === 'tglib.input.AuthorizationType') {
      return 'user';
    } else if (args.string === 'tglib.input.AuthorizationValue') {
      // return await makeReadLine('your phone:');
      return env.USER_PHONE;
    }

    return await defaultHandler(args);
  });

// register callback for errors
  client.registerCallback('td:error', (error) => {
    console.log('[error]', error);
  });

  await client.ready;
}

@Injectable()
export class TgClient {
  client = client;
  options: {[key: string]: number | string | boolean} = {};
  updates$ = new Subject<IUpdateEvent>();

  constructor() {
    this.client.registerCallback('td:update', (update: IUpdateEvent) => {
      this.updates$.next(update);
    });

    this.setOption('online', true);

    this.updateCurrentState().then(({updates}) => {
      updates.forEach(update => {
        this.updates$.next(update);
      });
    }, () => {});

    this.updates$.pipe(filter<IUpdateOptionEvent>(update => update['@type'] === 'updateOption'))
      .subscribe(update => {
        this.options[update.name] = update.value.value;
      });
  }

  async getChats(): Promise<IChatFullData[]> {
    return await client.tg.getAllChats();
  }

  async sendTextMessage(text: string, chat_id: number): Promise<IChatFullData[]> {
    return await client.tg.sendTextMessage({
      $text: new Structs.TextStruct(text, 'textParseModeHTML'),
      chat_id,
    });
  }

  async getMessages(chatId: number): Promise<IMessage[]> {
    const limit = 10;
    const allMessages = new Map<string, IMessage>();
    let triesLeft = 9;

    while (allMessages.size < limit || triesLeft--) {
      const currentChunk = await client.fetch({
        '@type': 'getChatHistory',
        chat_id: chatId,
        offset: -limit * triesLeft,
        limit: 100,
      });

      currentChunk.messages.forEach(message => {
        allMessages.set(message.id, message);
      });
    }

    return [...allMessages.values()];
  }

  async openChat(chatId: number): Promise<IOkResponse> {
    return await client.fetch({
      '@type': 'openChat',
      chat_id: chatId,
    });
  }

  async readChatMessages(chatId: number, messagesIds: number[]): Promise<IOkResponse> {
    return await client.fetch({
      '@type': 'viewMessages',
      chat_id: chatId,
      message_ids: messagesIds,
      force_read: false,
    });
  }

  async readAllChatMentions(chatId: number): Promise<IOkResponse> {
    return await client.fetch({
      '@type': 'readAllChatMentions',
      chat_id: chatId,
    });
  }

  async setOption(name: string, value: number | string | boolean): Promise<IOkResponse> {
    return await client.fetch({
      '@type': 'setOption',
      name,
      value: {
        '@type': 'optionValueBoolean',
        value,
      },
    });
  }

  async closeChat(chatId: number): Promise<IOkResponse> {
    return await client.fetch({
      '@type': 'closeChat',
      chat_id: chatId,
    });
  }

  async updateCurrentState(): Promise<IUpdatesResponse> {
    return await client.fetch({
      '@type': 'getCurrentState',
    });
  }

  async getUser(userId: number): Promise<IUser> {
    return client.fetch({
      '@type': 'getUser',
      user_id: userId,
    });
  }
}
