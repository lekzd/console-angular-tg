import {IChatFullData, IMessage, IMessagesResponse, IUser} from "./tgInterfaces";

const readline = require('readline');
import {Injectable} from '@angular/core';
import {config} from 'dotenv';

const env = config().parsed;
const { Client } = require('tglib/node');
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

  await client.ready;
}

@Injectable()
export class TgClient {
  client = client;

  async getCharts(): Promise<IChatFullData[]> {
    return await client.tg.getAllChats();
  }

  async getMessages(chat: IChatFullData): Promise<IMessage[]> {
    const limit = 10;
    const allMessages = new Map<string, IMessage>();
    let triesLeft = 9;

    while (allMessages.size < limit || triesLeft--) {
      const currentChunk = await client.fetch({
        '@type': 'getChatHistory',
        chat_id: chat.id,
        offset: -limit * triesLeft,
        limit: 100,
      });

      currentChunk.messages.forEach(message => {
        allMessages.set(message.id, message);
      });
    }

    return [...allMessages.values()];
  }

  async getMessagesAuthors(messages: IMessage[]): Promise<IUser[]> {
    const userIds = new Set<number>(messages.map(m => m.sender_user_id));

    const promises = [...userIds].map(userId => {
      return client.fetch({
        '@type': 'getUser',
        user_id: userId,
      });
    });

    return await Promise.all(promises);
  }

  // async getDialogs(): Promise<IMessagesResponse> {
  //   return await client.fetch({
  //     '@type': 'getDialogs',
  //     limit: 100,
  //     offset_date: (new Date(2019, 4, 1)).getTime(),
  //     offset_id: 0,
  //   });
  // }
}
