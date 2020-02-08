import { TextSelection, AllSelection, EditorState, Transaction } from 'prosemirror-state';
import { Node as ProsemirrorNode, NodeType } from 'prosemirror-model';

export const LINE_HEIGHT_100 = 1.7;

const DEFAULT_LINE_HEIGHT = '100%';

export const ALLOWED_NODE_TYPES = [
  'paragraph',
  'heading',
  'list_item',
  'todo_item',
];

const NUMBER_VALUE_PATTERN = /^\d+(.\d+)?$/;

export function isLineHeightActive (state: EditorState, lineHeight: string): boolean {
  const { selection, doc } = state;
  const { from, to } = selection;

  let keepLooking = true;
  let active = false;

  doc.nodesBetween(from, to, (node) => {
    const nodeType = node.type;
    const lineHeightValue = node.attrs.lineHeight || DEFAULT_LINE_HEIGHT;

    if (ALLOWED_NODE_TYPES.includes(nodeType.name)) {
      if (keepLooking && lineHeight === lineHeightValue) {
        keepLooking = false;
        active = true;

        return false;
      }
      return nodeType.name !== 'list_item' && nodeType.name !== 'todo_item';
    }
    return keepLooking;
  });

  return active;
}

export function transformLineHeightToCSS (value: string): string {
  if (!value) return '';

  let strValue = String(value);

  if (NUMBER_VALUE_PATTERN.test(strValue)) {
    const numValue = parseFloat(strValue);
    strValue = String(Math.round(numValue * 100)) + '%';
  }

  return parseFloat(value) * LINE_HEIGHT_100 + '%'; ;
}

interface SetLineHeightTask {
  node: ProsemirrorNode,
  nodeType: NodeType,
  pos: number,
}

export function setTextLineHeight (tr: Transaction, lineHeight: string): Transaction {
  const { selection, doc } = tr;

  if (!selection || !doc) return tr;

  if (!(selection instanceof TextSelection || selection instanceof AllSelection)) {
    return tr;
  }

  const { from, to } = selection;

  const tasks: Array<SetLineHeightTask> = [];
  const lineHeightValue = (lineHeight && lineHeight !== DEFAULT_LINE_HEIGHT) ? lineHeight : null;

  doc.nodesBetween(from, to, (node, pos) => {
    const nodeType = node.type;
    if (ALLOWED_NODE_TYPES.includes(nodeType.name)) {
      const lineHeight = node.attrs.lineHeight || null;
      if (lineHeight !== lineHeightValue) {
        tasks.push({
          node,
          pos,
          nodeType,
        });
      }
      return nodeType.name !== 'list_item' && nodeType.name !== 'todo_item';
    }
    return true;
  });

  if (!tasks.length) return tr;

  tasks.forEach(task => {
    const { node, pos, nodeType } = task;
    let { attrs } = node;

    attrs = {
      ...attrs,
      lineHeight: lineHeightValue,
    };

    tr = tr.setNodeMarkup(pos, nodeType, attrs, node.marks);
  });

  return tr;
}
