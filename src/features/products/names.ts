/** Pronomes de tratamento que vêm antes do nome no cadastro ("Dra. Fernanda Lima"). */
const TITLES = new Set(['sr', 'sra', 'srta', 'dr', 'dra', 'prof', 'profa', 'dona', 'd']);

/**
 * Palavras que entram no cadastro no lugar do nome (formulário mal preenchido, conta de teste):
 * "Oi, Cliente!" soa pior do que não dizer nome nenhum.
 */
const PLACEHOLDERS = new Set([
  'cliente',
  'aluna',
  'aluno',
  'teste',
  'usuario',
  'usuaria',
  'comprador',
  'compradora',
  'nome',
]);

/** Um nome de verdade: só letras, com hífen ou apóstrofo no meio ("Ana-Paula", "D'Ávila"). */
const NAME_WORD = /^\p{L}+(?:['’-]\p{L}+)*$/u;
const NAME_MIN = 2;
const NAME_MAX = 20;

/** Sem acento e em minúsculas, pra comparar com as listas acima. */
function plain(word: string): string {
  return word.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Tudo em maiúsculas ou em minúsculas (como o cadastro às vezes chega): a primeira letra de cada
 * parte maiúscula. Com maiúsculas e minúsculas misturadas, ela escreveu assim de propósito.
 */
function fixCase(word: string): string {
  if (word !== word.toUpperCase() && word !== word.toLowerCase()) return word;
  return word
    .toLowerCase()
    .replace(
      /(^|['’-])(\p{L})/gu,
      (_, before: string, letter: string) => before + letter.toUpperCase(),
    );
}

/**
 * Como chamar a aluna nas saudações ("Oi, Ana!"). O nome que ela escolheu no perfil vale como ela
 * escreveu. Sem ele, o primeiro nome do cadastro, depois do pronome de tratamento e com
 * maiúsculas ajeitadas. Vazio quando o cadastro não parece um nome (email, números, uma letra só,
 * "Cliente"): a frase sai sem nome, em vez de "Oi, maria@gmail.com!".
 */
export function greetingName(account: {
  name: string;
  preferredName?: string | null | undefined;
}): string {
  const preferred = account.preferredName?.trim().replace(/\s+/g, ' ');
  if (preferred) return preferred;

  const words = account.name.trim().split(/\s+/);
  const word = words.find((candidate) => !TITLES.has(plain(candidate).replace(/\.$/, '')));
  if (!word || !NAME_WORD.test(word)) return '';
  if (word.length < NAME_MIN || word.length > NAME_MAX) return '';
  if (PLACEHOLDERS.has(plain(word))) return '';
  return fixCase(word);
}
