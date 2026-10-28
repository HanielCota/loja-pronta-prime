'use server';

export type DeskActionState = { ok: boolean; message: string };

const retired: DeskActionState = { ok: false, message: 'O atendimento agora é pelo WhatsApp.' };

export async function assignAction(
  _state: DeskActionState,
  _form: FormData,
): Promise<DeskActionState> {
  return retired;
}

export async function statusAction(
  _state: DeskActionState,
  _form: FormData,
): Promise<DeskActionState> {
  return retired;
}

export async function priorityAction(
  _state: DeskActionState,
  _form: FormData,
): Promise<DeskActionState> {
  return retired;
}

export async function topicAction(
  _state: DeskActionState,
  _form: FormData,
): Promise<DeskActionState> {
  return retired;
}

export async function queueAction(
  _state: DeskActionState,
  _form: FormData,
): Promise<DeskActionState> {
  return retired;
}

export async function availabilityAction(
  _state: DeskActionState,
  _form: FormData,
): Promise<DeskActionState> {
  return retired;
}

export async function markReadAction(_number: number, _messageId: string): Promise<void> {}

export async function getWaitingTicketCount(): Promise<number> {
  return 0;
}
