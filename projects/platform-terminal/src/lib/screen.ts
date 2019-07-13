import { Injectable } from '@angular/core';
import * as blessed from 'blessed';
import { Widgets } from 'blessed';
import {config} from 'dotenv';
import { ElementFactory, elementsFactory } from './elements-registry';

const env = config().parsed;

@Injectable()
export class Screen {
  private screen: Widgets.Screen;

  constructor() {
    this.init();
  }

  createElement(name: string, options: any = {}): Widgets.BoxElement {
    let elementFactory: ElementFactory = elementsFactory.get(name);

    if (!elementFactory) {
      elementFactory = elementsFactory.get('box');
    }

    return elementFactory({ ...options, screen: this.screen });
  }

  selectRootElement(): Widgets.Screen {
    return this.screen;
  }

  private init() {
    this.screen = blessed.screen({
      smartCSR: true,
      fullUnicode: !!env.EMOJI,
    });
    this.setupExitListener();
  }

  private setupExitListener() {
    this.screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
  }
}
