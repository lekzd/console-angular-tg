import {Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {IUser, IUpdateUserEvent, IMessage} from '../../tgInterfaces';
import {TgClient} from '../../tbClient';
import { filter, map } from 'rxjs/internal/operators';

@Injectable()
export class UsersService {
  private storage = new Map<number, IUser>();

  get userUpdates$(): Observable<IUser> {
    return this.tgClient.updates$
      .pipe(
        filter<IUpdateUserEvent>(update => update["@type"] === 'updateUser'),
        filter(update => !!update.user),
        map(update => update.user),
      )
  }

  constructor(private tgClient: TgClient) {
    this.userUpdates$.subscribe(user => {
      if (this.storage.has(user.id)) {
        // todo: update user;
        return;
      }

      this.storage.set(user.id, user);
    })
  }

  async getUser(id: number): Promise<IUser> {
    if (this.storage.has(id)) {
      return this.storage.get(id);
    }

    return await this.tgClient.getUser(id);
  }

  async getMessagesAuthors(messages: IMessage[]): Promise<IUser[]> {
    const userIds = new Set<number>(messages.map(m => m.sender_user_id).filter(Number));
    const promises = [...userIds].map(userId => this.getUser(userId));

    return await Promise.all(promises);
  }
}
