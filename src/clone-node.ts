import { copyClass } from './copy-class'
import { copyPseudoContent } from './copy-pseudo-content'
import { copyInputValue } from './copy-input-value'
import { copyCssStyles } from './copy-css-styles'
import {
  isElementNode,
  isHTMLElementNode,
  isSVGElementNode,
  isScriptElement,
  isSlotElement,
  isStyleElement,
  isTextNode,
  isVideoElement,
} from './utils'
import { createElementClone } from './create-element-clone'
import type { Context } from './context'

function appendChildNode<T extends Node>(
  clone: T,
  child: ChildNode,
  context: Context,
): void {
  if (isElementNode(child) && (isStyleElement(child) || isScriptElement(child))) return

  if (context.filter && !context.filter(child)) return

  clone.appendChild(cloneNode(child, context))
}

function cloneChildNodes<T extends Node>(
  node: T,
  clone: T,
  context: Context,
): void {
  const firstChild = (
    isElementNode(node)
      ? node.shadowRoot?.firstChild
      : undefined
  ) ?? node.firstChild

  for (let child = firstChild; child; child = child.nextSibling) {
    if (
      isElementNode(child)
      && isSlotElement(child)
      && typeof child.assignedNodes === 'function'
    ) {
      child.assignedNodes().forEach(assignedNode => {
        appendChildNode(clone, assignedNode as ChildNode, context)
      })
    } else {
      appendChildNode(clone, child, context)
    }
  }
}

function applyCssStyleWithOptions(style: CSSStyleDeclaration, context: Context) {
  const { backgroundColor, width, height, style: styles } = context
  if (backgroundColor) style.backgroundColor = backgroundColor
  if (width) style.width = `${ width }px`
  if (height) style.height = `${ height }px`
  if (styles) {
    for (const name in styles) {
      style[name] = styles[name]!
    }
  }
}

export function cloneNode<T extends Node>(
  node: T,
  context: Context,
  isRoot = false,
): Node {
  const { ownerDocument, ownerWindow, fontFamilies } = context

  if (ownerDocument && isTextNode(node)) {
    return ownerDocument.createTextNode(node.data)
  }

  if (ownerDocument
    && ownerWindow
    && isElementNode(node)
    && (isHTMLElementNode(node) || isSVGElementNode(node))) {
    const style = ownerWindow.getComputedStyle(node)

    if (style.display === 'none') {
      return ownerDocument.createComment(node.tagName.toLowerCase())
    }

    const clone = createElementClone(node, context)
    const cloneStyle = clone.style

    copyCssStyles(node, style, cloneStyle, isRoot, context)

    if (isRoot) {
      applyCssStyleWithOptions(cloneStyle, context)
    }

    if (cloneStyle.fontFamily) {
      fontFamilies.add(cloneStyle.fontFamily)
    }

    copyClass(node, clone)

    copyPseudoContent(node, clone, ownerWindow)

    copyInputValue(node, clone)

    if (!isVideoElement(node)) {
      cloneChildNodes(node, clone, context)
    }

    return clone
  }

  const clone = node.cloneNode(false)

  cloneChildNodes(node, clone, context)

  return clone
}
