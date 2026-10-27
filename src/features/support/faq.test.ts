import { describe, expect, test } from 'bun:test';
import { answerFromFaq, DEFAULT_FAQ_ANSWERS, isAllowedFaqPath } from './faq';

describe('assistente (FAQ)', () => {
  test('responde a situação que tem resposta', () => {
    const result = answerFromFaq(DEFAULT_FAQ_ANSWERS, {
      topicId: 'lessons',
      situationId: 'video-not-loading',
      alwaysHuman: false,
    });
    expect(result.kind === 'answer' && result.answer.id).toBe('video-not-loading');
  });

  test('dinheiro, ouvidoria e compra que não aparece vão pra uma pessoa', () => {
    expect(answerFromFaq(DEFAULT_FAQ_ANSWERS, { topicId: 'payment', situationId: 'refund', alwaysHuman: true })).toEqual({
      kind: 'needs_human',
      reason: 'always_human',
    });
    expect(
      answerFromFaq(DEFAULT_FAQ_ANSWERS, { topicId: 'access', situationId: 'product-missing', alwaysHuman: false }),
    ).toEqual({ kind: 'needs_human', reason: 'always_human' });
  });

  test('sem resposta pra situação, vai pra uma pessoa', () => {
    expect(
      answerFromFaq(DEFAULT_FAQ_ANSWERS, { topicId: 'lessons', situationId: 'lesson-question', alwaysHuman: false }),
    ).toEqual({ kind: 'needs_human', reason: 'no_match' });
  });

  test('resposta desativada não aparece', () => {
    const answers = DEFAULT_FAQ_ANSWERS.map((answer) => ({ ...answer, active: false }));
    expect(answerFromFaq(answers, { topicId: 'lessons', situationId: 'video-not-loading', alwaysHuman: false }).kind).toBe(
      'needs_human',
    );
  });

  test('os links de fábrica apontam só pra páginas permitidas', () => {
    for (const answer of DEFAULT_FAQ_ANSWERS) {
      for (const link of answer.links) expect(isAllowedFaqPath(link.path)).toBe(true);
    }
  });
});
