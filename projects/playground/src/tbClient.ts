import {
  IChatFullData, IMessage, IMessagesResponse, IOkResponse, IUpdateConnectionStateEvent, IUpdateEvent, IUpdatesResponse,
  IUser,
  IUpdateOptionEvent,
  IProxiesResponse,
  ISecondsResponse,
  IProxy
} from './tgInterfaces';
import {Injectable} from '@angular/core';
import {Structs} from 'tglib';
import {Subject, BehaviorSubject} from 'rxjs';
import {filter} from 'rxjs/internal/operators';
const { Client } = require('tglib/node');

interface IProxyConfig {
  type: string;
  server: string;
  port: number;
  data: any;
}

const env = require('../../../../env.json');
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
  usedProxy$ = new BehaviorSubject<IProxy>(null);

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

    this.tryProxiesFromConfig(env.proxies);
  }

  private async tryProxiesFromConfig(proxies: IProxyConfig[]) {
    const response = await this.getProxies();
    const activeProxy = response.proxies.find(({is_enabled}) => is_enabled);

    if (activeProxy) {
      this.usedProxy$.next(activeProxy);

      return;
    }

    const promises = proxies
      .filter(({server, port}) => {
        return !response.proxies.some(savedProxy =>
          savedProxy.server === server
          && savedProxy.port === port
        )
      })
      .map(({type, server, port, data}) => this.addProxy(server, port, type, data));

    await Promise.all(promises);

    const allProxies = await this.getProxies();

    for (let i = 0; i < allProxies.proxies.length; i++) {
      const proxyItem = allProxies.proxies[i];

      try {
        await this.pingProxy(proxyItem.id);
        await this.enableProxy(proxyItem.id);

        break;
      } catch (e) {
        continue;
      }
    }
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

  async getChatLastMessages(chat: IChatFullData): Promise<IMessage[]> {
    const chatId = chat.id;
    const limit = 100;
    const allMessages = new Map<number, IMessage>();
    let triesLeft = 9;

    // if chat is empty
    if (!chat.last_message) {
      return [];
    }

    let lastLoadedMessage = chat.last_message;

    // For optimal performance the number of returned messages is chosen by the library.
    while (allMessages.size < limit || triesLeft--) {
      const currentChunk = await client.fetch({
        '@type': 'getChatHistory',
        chat_id: chatId,
        from_message_id: lastLoadedMessage.id,
        limit,
      }) as IMessagesResponse;

      if (currentChunk.total_count === 0) {
        break;
      }

      currentChunk.messages.forEach(message => {
        allMessages.set(message.id, message);
      });

      lastLoadedMessage = currentChunk.messages.pop();
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

  async getMessage(chat_id: number, message_id: number): Promise<IUser> {
    return client.fetch({
      '@type': 'getMessage',
      chat_id,
      message_id,
    });
  }

  async getProxies(): Promise<IProxiesResponse> {
    return client.fetch({
      '@type': 'getProxies',
    });
  }

  async pingProxy(proxy_id: number): Promise<ISecondsResponse> {
    return client.fetch({
      '@type': 'pingProxy',
      proxy_id,
    });
  }

  async enableProxy(proxy_id: number): Promise<IOkResponse> {
    return client.fetch({
      '@type': 'enableProxy',
      proxy_id,
    });
  }

  async addProxy(server: string, port: number, type: string, data?: any): Promise<IOkResponse> {
    return client.fetch({
      '@type': 'addProxy',
      server,
      port,
      type: {
        '@type': type,
        ...data,
      },
    });
  }
}
