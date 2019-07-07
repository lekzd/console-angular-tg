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
  .set('textbox', deferredElement(blessed.textbox))
  .set('list', deferredElement(blessed.list))
  .set('line', deferredElement(contrib.line))
  .set('sparkline', deferredElement(contrib.sparkline))
  .set('bar', deferredElement(contrib.bar))
  .set('table', deferredElement(contrib.table))
  .set('map', deferredElement(contrib.map))
  .set('log', deferredElement(contrib.log))
  .set('grid', gridFactory);

