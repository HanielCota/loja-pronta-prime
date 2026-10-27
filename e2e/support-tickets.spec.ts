import { expect, test, type Page } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { closeDatabase, database, PASSWORD, studentEmail } from './support/students';
import { expectNoA11yViolations, signIn } from './support/auth';

test.afterAll(closeDatabase);
test.setTimeout(240_000);

async function createAccount(kind: string, name: string, role: string) {
  const email = studentEmail(kind);
  await auth.api.createUser({
    body: {
      email,
      password: PASSWORD,
      name,
      // O plugin admin só tipa os papéis que conhece; o campo guarda texto livre.
      role: role as 'admin',
      data: { emailVerified: true, mustChangePassword: false },
    },
  });
  return email;
}

async function openGuidedTicket(page: Page) {
  await page.goto('/suporte/novo');
  await page.getByRole('button', { name: 'Aulas do curso' }).click();
  await page.getByRole('button', { name: /A aula não carrega/ }).click();
  // A resposta automática aparece antes de enviar.
  await expect(page.getByRole('heading', { name: 'Tente estes passos antes' })).toBeVisible();
  await page.getByRole('button', { name: 'Ainda preciso de ajuda' }).click();
  await page.getByRole('textbox').fill('Etapa 2, aula 5: a tela fica preta e o vídeo não começa no Chrome.');
  await page.getByRole('button', { name: 'Enviar chamado' }).click();
  await expect(page).toHaveURL(/\/suporte\/\d+\?enviado=1$/);
  return Number(new URL(page.url()).pathname.split('/').at(-1));
}

test('a aluna abre um chamado guiado, a equipe responde e o atendimento entra no Desempenho', async ({
  page,
  browser,
}) => {
  const studentAddress = await createAccount('suporte-aluna', 'Maria Clara', 'user');
  const agentAddress = await createAccount('suporte-atendente', 'Ana Atendente', 'support_agent');
  const supervisorAddress = await createAccount('suporte-supervisor', 'Sara Supervisora', 'support_supervisor');

  await signIn(page, studentAddress, PASSWORD, '/suporte');
  await expect(page.getByRole('heading', { name: 'Suporte', level: 1 })).toBeVisible();
  await expectNoA11yViolations(page);
  const number = await openGuidedTicket(page);
  await expect(page.getByText('Aguardando suporte').first()).toBeVisible();
  await expectNoA11yViolations(page);

  const agentContext = await browser.newContext();
  const agent = await agentContext.newPage();
  const supervisorContext = await browser.newContext();
  const supervisor = await supervisorContext.newPage();
  try {
    // A atendente só vê os Chamados: o resto do admin nem existe pra ela.
    await signIn(agent, agentAddress, PASSWORD, '/admin');
    await expect(agent).toHaveURL(/\/admin\/chamados$/);
    const menu = agent.getByRole('navigation', { name: 'Seções da administração' }).first();
    await expect(menu.getByRole('link', { name: /Chamados/ })).toBeVisible();
    await expect(menu.getByRole('link', { name: 'Contas' })).toHaveCount(0);
    await expect(menu.getByRole('link', { name: 'Desempenho' })).toHaveCount(0);
    expect((await agent.goto('/admin/contas'))?.status()).toBe(404);
    expect((await agent.goto('/admin/suporte/desempenho'))?.status()).toBe(404);

    await agent.goto(`/admin/chamados/${number}`);
    await agent.getByRole('button', { name: 'Assumir chamado' }).click();
    await expect(agent.getByText('Responsável salva.')).toBeVisible();
    await agent.getByRole('button', { name: 'Nota interna' }).click();
    await agent.locator('#staff-reply').fill('Conferi o vídeo: está publicado.');
    await agent.getByRole('button', { name: 'Salvar nota' }).click();
    await expect(agent.getByText('Nota interna salva.')).toBeVisible();
    await agent.getByRole('button', { name: 'Nota interna' }).click();
    await agent.locator('#staff-reply').fill('Oi, Maria! Atualize a página e me diga se voltou.');
    await agent.getByRole('button', { name: 'Enviar', exact: true }).click();
    await expect(agent.getByText('Resposta enviada à aluna.')).toBeVisible();
    await expectNoA11yViolations(agent);

    // A aluna não vê a nota interna e responde que ainda não resolveu: o chamado volta pra fila.
    await page.reload();
    await expect(page.getByText('Conferi o vídeo: está publicado.')).toHaveCount(0);
    await expect(page.getByText('Oi, Maria! Atualize a página e me diga se voltou.')).toBeVisible();
    await page.getByRole('button', { name: 'Ainda não', exact: true }).click();
    await expect(page.getByText('Avisamos o suporte que ainda não resolveu.')).toBeVisible();
    const [waiting] = (await database().query('select status from support_tickets where number = $1', [number])).rows;
    expect(waiting.status).toBe('open');

    await agent.reload();
    await agent.locator('#staff-reply').fill('Arrumei o vídeo. Pode testar de novo?');
    await agent.getByRole('button', { name: 'Enviar', exact: true }).click();
    await expect(agent.getByText('Resposta enviada à aluna.')).toBeVisible();

    await page.reload();
    await page.getByRole('button', { name: 'Sim, resolveu' }).click();
    await expect(page.getByText('Chamado encerrado.')).toBeVisible();
    await page.waitForTimeout(6500);
    await page.reload();
    await page.locator('label', { hasText: '5 estrelas' }).click();
    await page.getByRole('button', { name: 'Enviar avaliação' }).click();
    await expect(page.getByText(/Você avaliou este atendimento com 5 de 5/)).toBeVisible();

    // O supervisor vê o atendimento resolvido no Desempenho.
    await signIn(supervisor, supervisorAddress, PASSWORD, '/admin/suporte/desempenho');
    await expect(supervisor.getByRole('heading', { name: 'Desempenho do suporte' })).toBeVisible();
    await expect(supervisor.getByText('Resolvidos').first()).toBeVisible();
    await expectNoA11yViolations(supervisor);
    const events = (
      await database().query(
        `select type from support_ticket_events e join support_tickets t on t.id = e.ticket_id where t.number = $1 order by e.id`,
        [number],
      )
    ).rows.map((row) => row.type);
    expect(events).toEqual(expect.arrayContaining(['assigned', 'status_changed', 'rated']));
  } finally {
    await agentContext.close();
    await supervisorContext.close();
  }
});

test('quem não consegue entrar pede ajuda sem login, e o WhatsApp de sempre continua igual', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByRole('link', { name: 'Não consegue entrar? Fale com o suporte' }).click();
  await expect(page).toHaveURL(/\/suporte\/acesso$/);
  await expectNoA11yViolations(page);
  await page.getByLabel('Seu nome').fill('Joana');
  await page.getByLabel('E-mail da compra').fill(studentEmail('suporte-sem-conta'));
  await page.getByLabel('O que está acontecendo?').selectOption({ label: 'Não consigo entrar' });
  await page.getByLabel('Conte o que aparece quando você tenta entrar').fill('Aparece senha incorreta mesmo depois de trocar.');
  await page.getByRole('button', { name: 'Pedir ajuda' }).click();
  await expect(page.getByText(/Recebemos\. Se este for o e-mail da compra/)).toBeVisible();
  const [ticket] = (
    await database().query(`select channel, email_confirmed_at from support_tickets where requester_email = $1`, [
      studentEmail('suporte-sem-conta'),
    ])
  ).rows;
  expect(ticket.channel).toBe('public_form');
  // Até abrir o link do e-mail, o e-mail não está confirmado.
  expect(ticket.email_confirmed_at).toBeNull();
});
