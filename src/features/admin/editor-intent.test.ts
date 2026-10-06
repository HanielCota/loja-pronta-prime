import { describe, expect, test } from 'bun:test';
import { intentReloadsForm, parseEditorIntent } from './editor-intent';

describe('parseEditorIntent', () => {
  test('aceita só as ações conhecidas', () => {
    expect(parseEditorIntent('publish')).toBe('publish');
    expect(parseEditorIntent('down')).toBe('down');
    expect(parseEditorIntent('delete')).toBeNull();
    expect(parseEditorIntent(null)).toBeNull();
    expect(parseEditorIntent(new Blob())).toBeNull();
  });
});

describe('intentReloadsForm', () => {
  test('recarrega o formulário só quando os valores salvos mudam', () => {
    expect(intentReloadsForm('publish')).toBe(true);
    expect(intentReloadsForm('discard')).toBe(true);
    expect(intentReloadsForm('restore')).toBe(true);
    expect(intentReloadsForm('up')).toBe(false);
    expect(intentReloadsForm('archive')).toBe(false);
    expect(intentReloadsForm(undefined)).toBe(false);
  });
});
