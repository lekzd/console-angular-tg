import * as blessed from 'blessed';
import { IMessageFormattedText, IFormattedTextEntity, TextEntityType } from '../../tg/tgInterfaces';
import { colors, fg } from '../colors';

function wordWrap(str: string, width: number, delimiter: string) {
  // use this on single lines of text only

  if (str.length > width) {
    let p = width;

    for (; p > 0 && str[p] !== ' '; p--) {}

    if (p > 0) {
      const left = str.substring(0, p);
      const right = str.substring(p + 1);

      return left + delimiter + wordWrap(right, width, delimiter);
    }
  }

  return str;
}

export function multiParagraphWordWrap(str: string, width: number, delimiter: string): string[] {
  const arr = str.split(delimiter);

  for (let i = 0; i < arr.length; i++) {
    if (arr[i].length > width) {
      arr[i] = wordWrap(arr[i], width, delimiter).split(delimiter);
    }
  }

  const result = arr.reduce((acc, val) => acc.concat(val), []);
  const isEmpty = result.length === 0 || (result.length === 1 && !result[0]);

  return isEmpty ? null : arr.reduce((acc, val) => acc.concat(val), []);
}

function applyFormattingEntitities(text: string, entities: IFormattedTextEntity[]): string {
  if (entities.length === 0) {
    return text;
  }

  const tokens = new Map<{text: string}, TextEntityType>();
  const firstToken = text.substr(0, entities[0].offset);

  for (let i = 0; i < entities.length; i++) {
    const entity = entities[i];
    const nextEntity = entities[i + 1];
    const formattedToken = text.substr(entity.offset, entity.length);
    const tailToken = nextEntity
      ? text.substr(entity.offset + entity.length, nextEntity.offset)
      : text.substr(entity.offset + entity.length);

    if (formattedToken) {
      tokens.set({text: formattedToken}, entity.type['@type']);
    }

    if (tailToken) {
      tokens.set({text: tailToken}, null);
    }
  }

  tokens.forEach((type, value) => {
    if (type === 'textEntityTypeBold') {
      value.text = `{bold}${value.text}{/bold}`;
    }
    if (type === 'textEntityTypeItalic') {
      // not realized in terminals
    }
    if (type === 'textEntityTypeMention') {
      value.text = `{${fg(colors.fg9)}}${value.text}{/${fg(colors.fg9)}}`;
    }
    if (type === 'textEntityTypeUrl') {
      value.text = `{underline}${value.text}{/underline}`;
    }
  });

  return [firstToken, ...[...tokens.keys()].map(v => v.text)].join('');
}

export function escapeFormattingTags(text: IMessageFormattedText): string {
  const escaped = blessed.escape(text.text);
  const formatted = applyFormattingEntitities(escaped, text.entities);

  return formatted;
}
