'use client';

import { ArrowRightIcon, CircleAlertIcon, CircleCheckIcon, WandSparklesIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LogoIssue } from '../../logo/checks';
import { EditorDialog } from './editor-dialog';

/**
 * A conferência antes de seguir: o que deixaria o logo ruim de ver na Shopee, cada coisa com um
 * botão que conserta (e entra no histórico: Desfazer volta). A lista se atualiza a cada conserto;
 * sem nada pra arrumar, fica o "Tudo certo". Seguir assim mesmo também pode: é só um aviso.
 */
export function CheckDialog({
  open,
  issues,
  formId,
  onFix,
  onFixAll,
  onClose,
}: {
  open: boolean;
  issues: LogoIssue[];
  /** O formulário de "Gostei, continuar": os botões de seguir enviam ele. */
  formId: string;
  onFix: (issue: LogoIssue) => void;
  /** Todos os consertos de uma vez (uma mudança só no histórico). */
  onFixAll: () => void;
  onClose: () => void;
}) {
  const fixable = issues.filter((issue) => issue.fix);
  return (
    <EditorDialog
      open={open}
      title={issues.length ? 'Antes de seguir, vale arrumar' : 'Tudo certo com seu logo!'}
      onClose={onClose}
    >
      {issues.length ? (
        <>
          <ul className="flex flex-col gap-3">
            {issues.map((issue) => (
              <li
                key={issue.id}
                className="flex flex-col gap-3 rounded-2xl border-[1.5px] border-input p-4 sm:flex-row sm:items-center"
              >
                <p className="flex flex-1 items-start gap-2 text-body text-pretty">
                  <CircleAlertIcon
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0 text-destructive"
                  />
                  {issue.message}
                </p>
                {issue.fix ? (
                  <Button
                    type="button"
                    variant="soft"
                    className="w-auto shrink-0 px-5"
                    onClick={() => onFix(issue)}
                  >
                    {issue.fix.label}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            {fixable.length > 1 ? (
              <Button type="button" className="sm:w-auto sm:px-6" onClick={onFixAll}>
                <WandSparklesIcon aria-hidden="true" />
                Arrumar tudo
              </Button>
            ) : null}
            <Button type="submit" form={formId} variant="soft" className="sm:w-auto sm:px-6">
              Seguir assim mesmo
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="flex items-start gap-2 text-body text-pretty">
            <CircleCheckIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-link" />
            Dá pra ler o nome, nada fica cortado no círculo da Shopee e as cores aparecem bem.
          </p>
          <Button type="submit" form={formId} className="min-h-14">
            Gostei, continuar
            <ArrowRightIcon aria-hidden="true" />
          </Button>
        </>
      )}
    </EditorDialog>
  );
}
