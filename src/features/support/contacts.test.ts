import { describe, expect, test } from 'bun:test';
import { parseSupportPhones, SUPPORT_CONTACTS } from './contacts';

function form(value = '') {
  const data = new FormData();
  for (const topic of SUPPORT_CONTACTS) data.set(topic.id, value);
  return data;
}

describe('support contacts', () => {
  test('empty numbers keep every department unavailable', () => {
    expect(parseSupportPhones(form())).toEqual({
      ok: true,
      phones: { technical: '', ombudsman: '' },
    });
  });
  test('normalizes Brazilian numbers with country code and formatting', () => {
    const data = form();
    data.set('technical', '+55 (37) 99135-5966');
    data.set('ombudsman', '+55 (31) 3256-0307');
    expect(parseSupportPhones(data)).toEqual({
      ok: true,
      phones: {
        technical: '37991355966',
        ombudsman: '3132560307',
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
    data.set('ombudsman', '123');
    expect(parseSupportPhones(data)).toMatchObject({ ok: false, field: 'ombudsman' });
  });
  test('ignores retired contact fields from a previously opened form', () => {
    const data = form();
    data.set('lessons', '(11) 99999-1234');
    data.set('shipping', '(31) 99999-1234');
    expect(parseSupportPhones(data)).toEqual({
      ok: true,
      phones: { technical: '', ombudsman: '' },
    });
  });
  test('accepts a local area code that matches the country code', () => {
    const data = form();
    data.set('technical', '(55) 99999-1234');
    expect(parseSupportPhones(data)).toMatchObject({
      ok: true,
      phones: { technical: '55999991234' },
    });
  });
});
