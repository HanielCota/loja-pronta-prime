import { eq } from 'drizzle-orm';
import { cache } from 'react';
import { VIDEO_MAX_BYTES, VIDEO_TYPES, type VideoSlot } from '@/config/videos';
import { db } from '@/server/db';
import { videos } from '@/server/db/schema';
import { storage } from '@/server/storage';
import { videoType } from '../video-type';

/**
 * Os vídeos da jornada: qual arquivo está em cada lugar (slot) e a troca do arquivo. A troca é a
 * mesma pro script dev:video e pro painel que vai existir: guarda o arquivo novo, aponta o slot
 * pra ele e só então apaga o antigo (quem estava assistindo não fica sem vídeo no meio).
 */

export type StoredVideo = {
  key: string;
  contentType: string;
  size: number;
  /** A legenda (WebVTT), quando enviada. */
  captionsKey: string | null;
  updatedAt: Date;
};

/** O vídeo do slot, ou `null` (ainda não enviado). Lido uma vez por requisição. */
export const getVideo = cache(async (slot: VideoSlot): Promise<StoredVideo | null> => {
  const [row] = await db
    .select({
      key: videos.key,
      contentType: videos.contentType,
      size: videos.size,
      captionsKey: videos.captionsKey,
      updatedAt: videos.updatedAt,
    })
    .from(videos)
    .where(eq(videos.slot, slot));
  return row ?? null;
});

export type SaveVideoResult = { ok: true } | { ok: false; error: string };

/** Troca o vídeo do slot (o tipo é conferido pelo começo do arquivo, não pelo nome). */
export async function saveVideo(slot: VideoSlot, bytes: Uint8Array): Promise<SaveVideoResult> {
  if (bytes.length === 0) return { ok: false, error: 'O arquivo está vazio.' };
  if (bytes.length > VIDEO_MAX_BYTES) {
    return { ok: false, error: 'O vídeo é grande demais (máximo de 500 MB).' };
  }
  const contentType = videoType(bytes);
  if (!contentType) return { ok: false, error: 'Mande o vídeo em MP4 ou WebM.' };

  const before = await getVideo(slot);
  const key = `videos/${slot}/${crypto.randomUUID()}.${VIDEO_TYPES[contentType]}`;
  await storage().put(key, bytes, contentType);
  await db
    .insert(videos)
    .values({ slot, key, contentType, size: bytes.length })
    .onConflictDoUpdate({
      target: videos.slot,
      set: { key, contentType, size: bytes.length, updatedAt: new Date() },
    });
  if (before && before.key !== key) await storage().remove(before.key);
  return { ok: true };
}

/** Legenda: até 1 MB de texto WebVTT (um vídeo de 10 minutos tem uns 20 KB). */
const CAPTIONS_MAX_BYTES = 1024 * 1024;

/**
 * Troca a legenda do vídeo do slot (WebVTT: o arquivo começa com "WEBVTT"). Precisa do vídeo
 * já enviado; trocar o vídeo depois mantém a legenda (o painel avisa pra conferir).
 */
export async function saveCaptions(slot: VideoSlot, text: string): Promise<SaveVideoResult> {
  const video = await getVideo(slot);
  if (!video) return { ok: false, error: 'Envie o vídeo antes da legenda.' };
  // Sem a marca de início que alguns editores põem (BOM).
  const vtt = text.replace(/^﻿/, '');
  const bytes = new TextEncoder().encode(vtt);
  if (bytes.length > CAPTIONS_MAX_BYTES) return { ok: false, error: 'A legenda é grande demais.' };
  if (!vtt.startsWith('WEBVTT')) {
    return { ok: false, error: 'Mande a legenda no formato WebVTT (.vtt).' };
  }
  const key = `videos/${slot}/${crypto.randomUUID()}.vtt`;
  await storage().put(key, bytes, 'text/vtt');
  await db
    .update(videos)
    .set({ captionsKey: key, updatedAt: new Date() })
    .where(eq(videos.slot, slot));
  if (video.captionsKey) await storage().remove(video.captionsKey);
  return { ok: true };
}
