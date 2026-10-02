// Arquivos internos dos pacotes de idioma do zxcvbn-ts, importados um a um (só os que usamos;
// ver src/features/auth/password-strength.ts). Os pacotes não publicam tipos pra eles.

declare module '@zxcvbn-ts/language-common/dist/adjacencyGraphs.json.mjs' {
  import type { OptionsGraph } from '@zxcvbn-ts/core';
  const graphs: OptionsGraph;
  export default graphs;
}

declare module '@zxcvbn-ts/language-pt-br/dist/translations.mjs' {
  import type { TranslationKeys } from '@zxcvbn-ts/core';
  const translations: TranslationKeys;
  export default translations;
}

declare module '@zxcvbn-ts/language-pt-br/dist/wordSequences.json.mjs' {
  const wordSequences: Record<string, string[]>;
  export default wordSequences;
}

declare module '@zxcvbn-ts/language-common/dist/passwords.json.mjs' {
  const words: string[];
  export default words;
}

declare module '@zxcvbn-ts/language-pt-br/dist/commonWords.json.mjs' {
  const words: string[];
  export default words;
}

declare module '@zxcvbn-ts/language-pt-br/dist/firstnames.json.mjs' {
  const words: string[];
  export default words;
}

declare module '@zxcvbn-ts/language-pt-br/dist/lastnames.json.mjs' {
  const words: string[];
  export default words;
}
