import { expect, test } from '@playwright/test';
import { auth } from '@/server/auth/auth';
import { SUPPORT_CONTACTS, SUPPORT_TOPICS } from '@/features/support/contacts';
import { closeDatabase, database, PASSWORD, studentEmail } from './support/students';
import { expectNoA11yViolations, signIn } from './support/auth';

test.afterAll(closeDatabase);
test.setTimeout(120_000);

test('administrators configure support contacts and students see the saved departments', async ({
  page,
  browser,
}) => {
  const email = studentEmail('support-admin');
  await auth.api.createUser({
    body: {
      email,
      password: PASSWORD,
      name: 'Support administrator',
      role: 'admin',
      data: { emailVerified: true, mustChangePassword: false },
    },
  });
  const memberEmail = studentEmail('support-member');
  const { user: member } = await auth.api.createUser({
    body: {
      email: memberEmail,
      password: PASSWORD,
      name: 'Ana Support',
      role: 'user',
      data: { emailVerified: true, mustChangePassword: false },
    },
  });
  await database().query('insert into student_products (user_id, product) values ($1, $2)', [
    member.id,
    'sll',
  ]);
  await database().query(
    `insert into support_contacts (topic, phone) values
      ('lessons', '11999990002'), ('shipping', '11999990003')`,
  );
  await signIn(page, email, PASSWORD, '/admin/suporte');
  await expect(page.getByRole('heading', { name: 'Contatos por assunto' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: /WhatsApp de/ })).toHaveCount(2);
  await expect(page.getByText(/Rackel|Nabila/)).toHaveCount(0);

  const context = await browser.newContext();
  const student = await context.newPage();
  try {
    await signIn(student, memberEmail, PASSWORD, '/perfil');
    const support = student.getByRole('region', { name: 'Precisa de ajuda?' });
    await expect(support.getByText(/Em breve/)).toHaveCount(4);
    // Without phone numbers, only the privacy policy remains linked.
    await expect(support.getByRole('link')).toHaveCount(1);
    expect((await student.goto('/admin/suporte'))?.status()).toBe(404);
    await student.goto('/perfil');

    await page.getByLabel('WhatsApp de Mylena').fill('123');
    await page.getByRole('button', { name: 'Salvar contatos' }).click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Confira o WhatsApp de Mylena' }),
    ).toContainText('Confira o WhatsApp de Mylena');
    expect((await database().query('select * from support_contacts')).rows).toHaveLength(2);
    for (const [index, contact] of SUPPORT_CONTACTS.entries()) {
      await page.getByLabel(`WhatsApp de ${contact.name}`).fill(`+55 (11) 99999-123${index}`);
    }
    await page.getByRole('button', { name: 'Salvar contatos' }).click();
    await expect(
      page.getByText('Contatos de suporte salvos.', { exact: true }).first(),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('WhatsApp de Mylena')).toHaveValue('11999991230');
    await expect(page.getByLabel('WhatsApp de Dani')).toHaveValue('11999991231');
    await student.reload();
    await expect(support.getByRole('link')).toHaveCount(5);
    await expect(support.getByText(/Rackel|Nabila/)).toHaveCount(0);
    for (const topic of SUPPORT_TOPICS) {
      const index = SUPPORT_CONTACTS.findIndex((contact) => contact.id === topic.contactId);
      await expect(
        support.getByRole('link', {
          name: `Falar com ${topic.name} sobre ${topic.title} no WhatsApp`,
          exact: false,
        }),
      ).toHaveAttribute('href', new RegExp(`^https://wa[.]me/551199999123${index}[?]text=`));
      const response = await student.request.get(`/suporte/whatsapp/${topic.id}`, {
        maxRedirects: 0,
      });
      expect(response.status()).toBe(302);
      expect(response.headers().location).toMatch(
        new RegExp(`^https://wa[.]me/551199999123${index}[?]text=`),
      );
    }

    for (const mobile of [false, true]) {
      for (const dark of [false, true]) {
        const size = mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
        for (const target of [page, student]) {
          await target.setViewportSize(size);
          await target.evaluate(
            (theme) => {
              localStorage.setItem('theme', theme);
            },
            dark ? 'dark' : 'light',
          );
          await target.reload();
          await expectNoA11yViolations(target);
          expect(
            await target.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
          await target.screenshot({
            path: `.data/support-${target === page ? 'admin' : 'member'}-${mobile ? 'mobile' : 'desktop'}-${dark ? 'dark' : 'light'}.png`,
            fullPage: true,
          });
        }
      }
    }

    await student.getByRole('button', { name: 'Sua conta' }).click();
    await student.getByRole('menuitem', { name: 'Suporte no WhatsApp' }).click();
    await expect(student).toHaveURL(/\/perfil#suporte$/);
    await expectNoA11yViolations(student);

    const noJsContext = await browser.newContext({ javaScriptEnabled: false });
    try {
      const noJs = await noJsContext.newPage();
      await signIn(noJs, email, PASSWORD, '/admin/suporte');
      await noJs.getByLabel('WhatsApp de Mylena').fill('');
      await noJs.getByRole('button', { name: 'Salvar contatos' }).click();
      await expect(
        noJs.getByText('Contatos de suporte salvos.', { exact: true }).first(),
      ).toBeVisible();
      await student.reload();
      await expect(support.getByRole('link')).toHaveCount(3);
      await expect(support.getByText('Mylena · Em breve')).toHaveCount(2);
      const response = await student.request.get('/suporte/whatsapp/lessons', {
        maxRedirects: 0,
      });
      expect(response.status()).toBe(303);
      expect(new URL(response.headers().location ?? '').pathname).toBe('/suporte');
    } finally {
      await noJsContext.close();
    }
  } finally {
    await context.close();
  }
});
