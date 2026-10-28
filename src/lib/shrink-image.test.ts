import { afterEach, expect, test } from 'bun:test';
import { shrinkImage } from './shrink-image';

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
const originalDecode = Object.getOwnPropertyDescriptor(globalThis, 'createImageBitmap');
afterEach(() => {
  for (const [key, descriptor] of [
    ['document', originalDocument],
    ['createImageBitmap', originalDecode],
  ] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

for (const failure of ['context', 'draw', 'encode', 'none']) {
  test(`image resources are released when ${failure} fails`, async () => {
    let closes = 0;
    const canvas = {
      width: 0,
      height: 0,
      getContext: () =>
        failure === 'context'
          ? null
          : {
              drawImage: () => {
                if (failure === 'draw') throw new Error('Draw failed');
              },
            },
      toBlob: (callback: (blob: Blob | null) => void) => {
        expect(closes).toBe(1);
        if (failure === 'encode') throw new Error('Encoding failed');
        callback(new Blob(['image'], { type: 'image/webp' }));
      },
    };
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: { createElement: () => canvas },
    });
    Object.defineProperty(globalThis, 'createImageBitmap', {
      configurable: true,
      value: async () => ({
        width: 4000,
        height: 3000,
        close: () => {
          closes++;
        },
      }),
    });
    const result = await shrinkImage(new File(['image'], 'image.png'));
    expect(result === null).toBe(failure !== 'none');
    expect(closes).toBe(1);
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });
}
