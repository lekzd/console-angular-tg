import { Injectable, Renderer2, RendererFactory2, RendererStyleFlags2, RendererType2 } from '@angular/core';
import {Widgets} from 'blessed';

import { Screen } from './screen';
import {Subject} from 'rxjs';
import {debounceTime, map, tap} from 'rxjs/internal/operators';

@Injectable()
export class TerminalRendererFactory implements RendererFactory2 {
  protected renderer: Renderer2;

  constructor(private screen: Screen) {
    this.renderer = new TerminalRenderer(screen);
  }

  end() {
    // this.screen.selectRootElement().render();
  }

  createRenderer(hostElement: any, type: RendererType2 | null): Renderer2 {
    return this.renderer;
  }
}

interface INode {
  $id: string;
  $type: string;
  $parent: string;
  $listeners: Map<string, Function>;
  $attributes: {[key: string]: any};
  element: Widgets.BlessedElement;
}

export class TerminalRenderer implements Renderer2 {
  readonly data: { [p: string]: any } = {};
  destroyNode: ((node: any) => void) | null;

  private nodes: INode[] = [
    {
      $id: null,
      $type: 'root',
      $parent: null,
      $listeners: new Map<string, Function>(),
      $attributes: {},
      element: null,
    }
  ];
  private addNode$ = new Subject<INode>();
  private updateAttributes$ = new Subject<INode>();

  constructor(private screen: Screen) {
    const nodesToAdd = new Set<INode>();
    const screenElement = this.screen.selectRootElement() as any as Widgets.BlessedElement;

    this.data.root = screenElement;
    this.nodes[0].element = screenElement;

    this.addNode$.pipe(
      tap(node => nodesToAdd.add(node)),
      debounceTime(100),
      map(() => [...nodesToAdd]),
      tap(() => nodesToAdd.clear()),
    ).subscribe(nodes => {
      nodes.forEach(node => {
        node.element = this.screen.createElement(node.$type, node.$attributes);

        node.$listeners.forEach((listener, event) => {
          // @ts-ignore
          node.element.on(event, listener);
        });

        const parentNode = this.nodes.find(({$id, element}) => $id === node.$parent && !!element);
        const parent = parentNode
          ? parentNode.element
          : screenElement;

        parent.append(node.element);
      });
    });

    const nodesToUpdate = new Set<INode>();

    this.updateAttributes$.pipe(
      tap(node => nodesToUpdate.add(node)),
      debounceTime(100),
      map(() => [...nodesToUpdate]),
      tap(() => nodesToUpdate.clear()),
    ).subscribe(nodes => {
      nodes.forEach(node => {
        Object.keys(node.$attributes)
          .filter(name => {
            return !(node.element.type === 'list' && name === 'items')
              && !(name === 'content')
              && !(name === 'border')
              ;
          }).forEach(name => {
            node.element[name] = node.$attributes[name];
          });
      });

      screenElement.render();
    });
  }

  private createNode(name: string, options: any = {}): INode {
    const node = {
      $id: Math.random().toString(36).substr(3),
      $type: name,
      $parent: null,
      $listeners: new Map<string, Function>(),
      $attributes: {...options},
      element: null,
    };

    this.nodes.push(node);

    return node;
  }

  createElement(name: string, namespace?: string | null): any {
    // return this.screen.createElement(name);
    const node = this.createNode(name, {});

    this.addNode$.next(node);

    return node;
  }

  createText(value: string): any {
    // return this.screen.createElement('text', { content: value });
    const node = this.createNode('text', {content: value});

    this.addNode$.next(node);

    return node;
  }

  selectRootElement(): INode {
    // return this.screen.selectRootElement();
    return this.nodes[0];
  }

  addClass(el: any, name: string): void {
  }

  appendChild(parent: INode, newChild: INode): void {
    // if (newChild instanceof contrib.grid) {
    //   return;
    // }
    //
    // if (parent instanceof contrib.grid) {
    //   (newChild as any).appendTo(parent);
    //   return;
    // }
    //
    // if (newChild) {
    //   parent.append(newChild);
    // }
    newChild.$parent = parent.$id;
  }

  createComment(value: string): any {
  }

  destroy(): void {
  }

  insertBefore(parent: any, newChild: any, refChild: any): void {
  }

  listen(target: INode, eventName: string, callback: (event: any) => (boolean | void)): () => void {
    if (target.element) {
      target.element.on(eventName, callback);
    } else {
      target.$listeners.set(eventName, callback);
    }

    return function () {
    };
  }

  nextSibling(node: any): any {
  }

  parentNode(node: any): any {
  }

  removeAttribute(node: any, name: string, namespace?: string | null): void {
  }

  removeChild(parent: any, oldChild: any): void {
  }

  removeClass(node: any, name: string): void {
  }

  removeStyle(node: any, style: string, flags?: RendererStyleFlags2): void {
  }

  setAttribute(node: INode, name: string, value: string, namespace?: string | null): void {
    node.$attributes[name] = value;

    if (node.element) {
      this.updateAttributes$.next(node);
    }
  }

  setProperty(node: INode, name: string, value: any): void {
    if (name === 'styles') {
      name = 'style';
    } else {
      node.$attributes[name] = value;
    }

    if (node.element) {
      if (name === 'content') {
        node.element.setContent(value);
        return;
      }

      if (name === 'items') {
        (node.element as any).setItems(value);
        return;
      }

      if (name === 'label') {
        node.element.setLabel(value);
        return;
      }

      this.updateAttributes$.next(node);
    }
  }

  setStyle(node: INode, style: string, value: any, flags?: RendererStyleFlags2): void {
    node.$attributes[style] = value;

    if (node.element) {
      this.updateAttributes$.next(node);
    }
  }

  setValue(node: INode, value: string): void {
    node.$attributes.content = value;
    // node.setContent(value);

    if (node.element) {
      this.updateAttributes$.next(node);
    }
  }
}
