/** Makes an element with an optional class and text. Text is never parsed as HTML. */
export function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Makes a button that runs `onClick` when pressed. */
export function button(className: string, text: string, onClick: () => void): HTMLButtonElement {
  const node = element('button', className, text);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
}

/** Something a screen has to tidy up when the player moves on. */
export type Cleanup = () => void;
