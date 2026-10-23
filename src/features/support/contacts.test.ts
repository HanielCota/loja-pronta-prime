import { describe, expect, test } from 'bun:test';
import { parseSupportPhones, SUPPORT_TOPICS } from './contacts';

function form(value = '') {
  const data = new FormData();
  for (const topic of SUPPORT_TOPICS) data.set(topic.id, value);
  return data;
}

describe('support contacts', () => {
  test('empty numbers keep every department unavailable', () => {
    expect(parseSupportPhones(form())).toEqual({
      ok: true,
      phones: { technical: '', lessons: '', shipping: '', ombudsman: '' },
    });
  });
  test('normalizes Brazilian numbers with country code and formatting', () => {
    const data = form();
    data.set('technical', '+55 (37) 99135-5966');
    data.set('lessons', '(55) 99999-1234');
    data.set('shipping', '+55 (31) 3256-0307');
    expect(parseSupportPhones(data)).toEqual({
      ok: true,
      phones: {
        technical: '37991355966',
        lessons: '55999991234',
        shipping: '3132560307',
        ombudsman: '',
      },
    });
  });
  test.each([
    '123',
    '(20) 99999-1234',
    '119999912345',
    'https://wa.me/5511999991234',
    '11999991234<script>',
    '11999991234 ext 2',
  ])('rejects invalid input: %s', (value) => {
    expect(parseSupportPhones(form(value))).toMatchObject({ ok: false, field: 'technical' });
  });
  test('requires all fields to avoid clearing omitted contacts', () => {
    expect(parseSupportPhones(new FormData()).ok).toBe(false);
  });
  test('reports the department with an invalid number before saving', () => {
    const data = form();
    data.set('shipping', '123');
    expect(parseSupportPhones(data)).toMatchObject({ ok: false, field: 'shipping' });
  });
});
