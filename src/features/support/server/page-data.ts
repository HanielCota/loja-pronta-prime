import { describeSupportHours, outOfHoursNotice } from '../support-hours';
import { whatsappContacts } from '../whatsapp';
import { getSupportPhones } from './contacts';
import { isPaused, loadSupportSchedule } from './settings';

const dayFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'America/Sao_Paulo',
});

/** O que toda tela de suporte da aluna mostra: o horário, se está fora dele e o WhatsApp. */
export async function loadSupportFrame(now = new Date()) {
  const [{ settings, schedule }, phones] = await Promise.all([loadSupportSchedule(), getSupportPhones()]);
  const paused = isPaused(settings, now);
  const pause =
    paused && settings.pausedUntil
      ? (settings.pauseMessage?.trim() ||
          `O suporte está em pausa até ${dayFormat.format(settings.pausedUntil)}. Você pode abrir o chamado: respondemos assim que voltarmos.`)
      : null;
  return {
    settings,
    schedule,
    phones,
    contacts: whatsappContacts(phones),
    hours: describeSupportHours(settings.weeklyHours),
    notice: outOfHoursNotice(now, schedule),
    pause,
  };
}
