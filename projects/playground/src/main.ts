import { platformTerminalDynamic } from 'platform-terminal';
import { enableProdMode } from '@angular/core';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';
import {tgClientInit} from './tbClient';

if (environment.production) {
  enableProdMode();
}

tgClientInit().then(() => {
  platformTerminalDynamic().bootstrapModule(AppModule)
    .catch(err => console.error(err));
});
