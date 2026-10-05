import { describe, expect, test } from 'bun:test';
import { videoType } from './video-type';

describe('videoType', () => {
  test('reconhece MP4 e WebM pelo começo do arquivo, não pelo nome', () => {
    const mp4 = new Uint8Array([0, 0, 0, 24, ...new TextEncoder().encode('ftypisom'), 0, 0, 0]);
    expect(videoType(mp4)).toBe('video/mp4');
    expect(videoType(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x01]))).toBe('video/webm');
    expect(videoType(new TextEncoder().encode('não sou um vídeo, só texto'))).toBeNull();
    expect(videoType(new Uint8Array())).toBeNull();
  });
});
