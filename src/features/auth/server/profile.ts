'use server';

import { parseWithZod } from '@conform-to/zod/v4';
import { and, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { PROFILE_PHOTO_MAX_BYTES } from '@/config/profile-photo';
import { consumeAttempt } from '@/server/auth/rate-limit';
import { reportAuthError } from '@/server/auth/report-error';
import { db } from '@/server/db';
import { session as sessionTable, user } from '@/server/db/schema';
import { storage } from '@/server/storage';
import { profilePhotoId, profilePhotoKey, profilePhotoUrl } from '../profile-photo';
import { changePasswordSchema, profileNameSchema } from '../schemas';
import { changeOwnPassword } from './password';
import { normalizeProfilePhoto } from './profile-photo-image';
import { getActiveSession, needsFirstPassword } from './session';
import { HIDDEN_FIELDS, reject, type FormResult } from './submission';

export type ProfileResult = { submission?: FormResult; saved?: boolean } | undefined;
export type ProfilePhotoResult = { error?: string; saved?: boolean; removed?: boolean } | undefined;

/**
 * Sessão de quem pode mexer no perfil. Uma Server Action pode ser chamada direto (não só pela
 * página), então a regra da página vale aqui também: quem ainda está com a senha temporária cria
 * a própria senha antes, no primeiro acesso.
 */
async function profileSession() {
  const session = await getActiveSession();
  if (!session || needsFirstPassword(session.user)) return null;
  return session;
}

/** Falhar ao limpar o bucket não pode transformar uma foto já salva em erro na tela. */
async function removePhotoFile(userId: string, id: string) {
  try {
    await storage().remove(profilePhotoKey(userId, id));
  } catch (error) {
    reportAuthError('remoção do arquivo da foto de perfil', error);
  }
}

/** Envia, troca ou remove só a foto de quem está logada; nenhum id de conta vem do formulário. */
export async function updateProfilePhoto(
  _state: ProfilePhotoResult,
  formData: FormData,
): Promise<ProfilePhotoResult> {
  let newId: string | null = null;
  let userId: string | undefined;
  let oldImage: string | null;
  const removed = formData.get('intent') === 'remove';
  try {
    const session = await profileSession();
    if (!session) return { error: 'Entre na sua conta de novo pra mudar a foto.' };
    userId = session.user.id;
    if (!(await consumeAttempt('profilePhotoPerUser', userId))) {
      return { error: 'Você tentou várias vezes. Espere um minuto e tente de novo.' };
    }

    if (!removed) {
      const file = formData.get('photo');
      if (!(file instanceof File) || !file.size) return { error: 'Escolha uma foto pra enviar.' };
      if (file.size > PROFILE_PHOTO_MAX_BYTES) return { error: 'Escolha uma foto de até 5 MB.' };
      const photo = await normalizeProfilePhoto(new Uint8Array(await file.arrayBuffer()));
      if (!photo)
        return { error: 'Não deu pra abrir essa foto. Escolha uma imagem JPG, PNG ou WebP.' };
      newId = crypto.randomUUID();
      await storage().put(profilePhotoKey(userId, newId), photo, 'image/webp');
    }

    const image = newId ? profilePhotoUrl(newId) : null;
    const ownerId = userId;
    // Duas abas podem trocar a foto juntas: a trava garante que cada uma apague só a anterior.
    oldImage = await db.transaction(async (tx) => {
      const [account] = await tx
        .select({ image: user.image })
        .from(user)
        .where(eq(user.id, ownerId))
        .for('update');
      if (!account) throw new Error('Conta não encontrada');
      await tx.update(user).set({ image, updatedAt: new Date() }).where(eq(user.id, ownerId));
      return account.image;
    });
  } catch (error) {
    if (userId && newId) await removePhotoFile(userId, newId);
    reportAuthError('troca da foto de perfil', error);
    return { error: 'Não deu pra salvar a foto agora. Tente de novo.' };
  }

  const oldId = profilePhotoId(oldImage);
  if (oldId) await removePhotoFile(userId, oldId);
  revalidatePath('/', 'layout');
  return { saved: true, removed };
}

/**
 * Como ela quer ser chamada, nas saudações. Fica à parte do nome completo da compra, que não muda.
 */
export async function updateName(
  _state: ProfileResult,
  formData: FormData,
): Promise<ProfileResult> {
  const submission = parseWithZod(formData, { schema: profileNameSchema });
  if (submission.status !== 'success') return { submission: submission.reply() };

  let session: Awaited<ReturnType<typeof profileSession>>;
  try {
    session = await profileSession();
  } catch (error) {
    reportAuthError('leitura da sessão no perfil', error);
    return { submission: reject(submission, 'unknown') };
  }
  if (!session) return { submission: reject(submission, 'session_expired') };

  const userId = session.user.id;
  if (!(await consumeAttempt('profileNamePerUser', userId))) {
    return { submission: reject(submission, 'rate_limited') };
  }

  try {
    await db
      .update(user)
      .set({ preferredName: submission.value.name, updatedAt: new Date() })
      .where(eq(user.id, userId));
  } catch (error) {
    reportAuthError('troca do nome no perfil', error);
    return { submission: reject(submission, 'unknown') };
  }

  // O nome aparece na saudação das telas de dentro.
  revalidatePath('/', 'layout');
  return { submission: submission.reply(), saved: true };
}

/**
 * Trocar a senha pedindo a atual. As outras sessões (outro celular, um computador emprestado)
 * terminam na mesma transação; esta continua a mesma para preservar o aviso de sucesso.
 */
export async function changePassword(
  _state: ProfileResult,
  formData: FormData,
): Promise<ProfileResult> {
  const submission = parseWithZod(formData, { schema: changePasswordSchema });
  if (submission.status !== 'success') {
    return { submission: submission.reply({ hideFields: HIDDEN_FIELDS }) };
  }

  let session: Awaited<ReturnType<typeof profileSession>>;
  try {
    session = await profileSession();
  } catch (error) {
    reportAuthError('leitura da sessão no perfil', error);
    return { submission: reject(submission, 'unknown') };
  }
  if (!session) return { submission: reject(submission, 'session_expired') };

  if (!(await consumeAttempt('changePasswordPerUser', session.user.id))) {
    return { submission: reject(submission, 'rate_limited') };
  }

  const { currentPassword, password } = submission.value;
  if (currentPassword === password) return { submission: reject(submission, 'unchanged_password') };

  try {
    const failure = await changeOwnPassword(
      session.user.id,
      session.session.token,
      currentPassword,
      password,
    );
    if (failure) return { submission: reject(submission, failure) };
  } catch (error) {
    reportAuthError('troca de senha no perfil', error);
    return { submission: reject(submission, 'unknown') };
  }

  // Sem os valores de volta: os campos de senha ficam vazios depois de salvar.
  return { submission: submission.reply({ resetForm: true }), saved: true };
}

/**
 * Sair dos outros aparelhos (um celular perdido, um computador emprestado): encerra todas as
 * sessões dela menos esta. Formulário de verdade, funciona sem JavaScript; a lista se atualiza
 * na volta.
 */
export async function signOutOtherDevices(): Promise<void> {
  let current: Awaited<ReturnType<typeof profileSession>>;
  try {
    current = await profileSession();
  } catch (error) {
    reportAuthError('leitura da sessão no perfil', error);
    return;
  }
  if (!current) return;

  try {
    await db
      .delete(sessionTable)
      .where(
        and(eq(sessionTable.userId, current.user.id), ne(sessionTable.id, current.session.id)),
      );
  } catch (error) {
    reportAuthError('saída dos outros aparelhos no perfil', error);
    return;
  }
  revalidatePath('/perfil');
}
