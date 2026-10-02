/// <reference lib="webworker" />
import { ZxcvbnFactory } from '@zxcvbn-ts/core';
import graphs from '@zxcvbn-ts/language-common/dist/adjacencyGraphs.json.mjs';
import passwords from '@zxcvbn-ts/language-common/dist/passwords.json.mjs';
import commonWords from '@zxcvbn-ts/language-pt-br/dist/commonWords.json.mjs';
import firstnames from '@zxcvbn-ts/language-pt-br/dist/firstnames.json.mjs';
import lastnames from '@zxcvbn-ts/language-pt-br/dist/lastnames.json.mjs';
import translations from '@zxcvbn-ts/language-pt-br/dist/translations.mjs';
import wordSequences from '@zxcvbn-ts/language-pt-br/dist/wordSequences.json.mjs';
import { toStrength, type StrengthRequest, type StrengthResponse } from './password-strength';

/**
 * Calcula a força da senha fora da linha principal: a digitação nunca espera por isso.
 *
 * Dicionários: só os que fazem diferença. Ficam de fora a Wikipedia em português (116KB) e a lista
 * diceware (17KB): comparando com o pacote completo, as notas foram iguais em 22 senhas típicas
 * em português. As chaves seguem os nomes originais (as dicas dependem delas). A busca aproximada
 * (Levenshtein) é a parte cara, mas sem ela "Senha@123" passaria por boa.
 */
const zxcvbn = new ZxcvbnFactory({
  translations,
  graphs,
  dictionary: {
    'passwords-common': passwords,
    'commonWords-pt-br': commonWords,
    'firstnames-pt-br': firstnames,
    'lastnames-pt-br': lastnames,
    ...wordSequences,
  },
  useLevenshteinDistance: true,
});

self.addEventListener('message', ({ data }: MessageEvent<StrengthRequest>) => {
  const strength = toStrength(zxcvbn.check(data.password, data.userInputs), data.password);
  // postMessage de worker não tem "targetOrigin" (isso é do postMessage entre janelas).
  // oxlint-disable-next-line unicorn/require-post-message-target-origin
  self.postMessage({ id: data.id, strength } satisfies StrengthResponse);
});
