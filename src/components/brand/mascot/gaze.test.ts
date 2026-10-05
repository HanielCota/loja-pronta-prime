import { expect, test } from 'bun:test';
import { gazeFor } from './gaze';

test('o mouse continua guiando o olhar com um campo de texto em foco', () => {
  class FakeInput {
    type = 'text';
    value = 'nome da loja';
    selectionEnd = this.value.length;
    scrollLeft = 0;

    getBoundingClientRect() {
      return { left: 200, top: 20, width: 120, height: 40 };
    }
  }

  const face = {
    getBoundingClientRect: () => ({ left: 0, top: 20, width: 100, height: 50 }),
  } as unknown as Element;
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const originalInputConstructor = Object.getOwnPropertyDescriptor(globalThis, 'HTMLInputElement');
  const originalGetComputedStyle = Object.getOwnPropertyDescriptor(globalThis, 'getComputedStyle');

  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: { activeElement: new FakeInput() },
  });
  Object.defineProperty(globalThis, 'HTMLInputElement', {
    configurable: true,
    value: FakeInput,
  });
  Object.defineProperty(globalThis, 'getComputedStyle', {
    configurable: true,
    value: () => ({
      fontWeight: '400',
      fontSize: '16px',
      fontFamily: 'sans-serif',
      paddingLeft: '0px',
      paddingRight: '0px',
    }),
  });

  try {
    const gaze = gazeFor(face, undefined, { x: -200, y: 47.5 });
    expect(gaze.x).toBeLessThan(-0.9);
  } finally {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else Reflect.deleteProperty(globalThis, 'document');

    if (originalInputConstructor) {
      Object.defineProperty(globalThis, 'HTMLInputElement', originalInputConstructor);
    } else {
      Reflect.deleteProperty(globalThis, 'HTMLInputElement');
    }

    if (originalGetComputedStyle) {
      Object.defineProperty(globalThis, 'getComputedStyle', originalGetComputedStyle);
    } else {
      Reflect.deleteProperty(globalThis, 'getComputedStyle');
    }
  }
});
