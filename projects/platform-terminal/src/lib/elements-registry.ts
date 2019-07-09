import * as blessed from 'blessed';
import { Widgets } from 'blessed';
import * as contrib from 'blessed-contrib';

import { gridFactory } from './adapters/grid-adapter';
import { deferredElement } from './adapters/deferred';

export type ElementFactory = (any) => Widgets.BoxElement;

export const elementsFactory: Map<string, ElementFactory> = new Map()
  .set('text', blessed.text)
  .set('box', blessed.box)
  .set('table', blessed.table)
  .set('textbox', blessed.textbox)
  .set('list', blessed.list)
  .set('line', contrib.line)
  .set('sparkline', contrib.sparkline)
  .set('bar', contrib.bar)
  .set('table', contrib.table)
  .set('map', contrib.map)
  .set('log', contrib.log)
  .set('grid', gridFactory);

