import { describe, expect, test } from 'bun:test';
import { greetingName } from './names';

const from = (name: string, preferredName?: string | null) => greetingName({ name, preferredName });

describe('greetingName', () => {
  test('o primeiro nome do cadastro', () => {
    expect(from('Ana Souza')).toBe('Ana');
    expect(from('  Maria   da Silva ')).toBe('Maria');
  });

  test('o nome escolhido no perfil vale inteiro, como ela escreveu', () => {
    expect(from('Ana Paula Souza', 'Ana Paula')).toBe('Ana Paula');
    expect(from('MARIA SILVA', '  Mari  ')).toBe('Mari');
    expect(from('Ana Souza', 'bia')).toBe('bia');
    // Vazio no perfil: volta pro cadastro.
    expect(from('Ana Souza', '   ')).toBe('Ana');
    expect(from('Ana Souza', null)).toBe('Ana');
  });

  test('ajeita nome todo em maiúsculas ou minúsculas', () => {
    expect(from('MARIA SILVA')).toBe('Maria');
    expect(from('maria silva')).toBe('Maria');
    expect(from('ANA-PAULA LIMA')).toBe('Ana-Paula');
    expect(from('JOÃO')).toBe('João');
    // Misturado: ela escreveu assim de propósito.
    expect(from('McKenzie Lima')).toBe('McKenzie');
  });

  test('pula o pronome de tratamento', () => {
    expect(from('Dra. Fernanda Lima')).toBe('Fernanda');
    expect(from('sra Ana')).toBe('Ana');
    expect(from('Prof. Dr. Carla')).toBe('Carla');
  });

  test('sem nome quando o cadastro não parece um nome', () => {
    expect(from('')).toBe('');
    expect(from('   ')).toBe('');
    expect(from('maria@gmail.com')).toBe('');
    expect(from('Cliente 123')).toBe('');
    expect(from('Aluna Teste')).toBe('');
    expect(from('Usuária')).toBe('');
    expect(from('M. Souza')).toBe('');
    expect(from('Ana123')).toBe('');
    expect(from('Maximilianaaaaaaaaaaaa Souza')).toBe('');
    expect(from('Dra.')).toBe('');
  });
});
