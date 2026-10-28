type PatchNoteDay = {
  date: string;
  changes: readonly {
    kind: 'Novo' | 'Melhoria' | 'Correção';
    title: string;
    description: string;
  }[];
};

/** Curated daily notes, newest first. Dates follow America/Sao_Paulo. */
export const patchNotes: readonly PatchNoteDay[] = [
  {
    date: '2026-10-28',
    changes: [
      {
        kind: 'Novo',
        title: 'Histórico de novidades no painel',
        description:
          'A administração agora tem uma página para consultar as mudanças da plataforma por data. O histórico fica no menu do painel e é exclusivo para administradores.',
      },
      {
        kind: 'Melhoria',
        title: 'Avisos dos chamados por e-mail desativados',
        description:
          'Após a publicação desta atualização, as atualizações dos chamados, os avisos à equipe, os alertas de atraso e os resumos deixam de ser enviados por e-mail. As respostas continuam no suporte da plataforma. Os e-mails de acesso, recuperação de senha e o link do chamado aberto sem login continuam funcionando.',
      },
    ],
  },
  {
    date: '2026-10-27',
    changes: [
      {
        kind: 'Novo',
        title: 'Chamados de suporte',
        description:
          'Foram adicionadas as telas de chamados das alunas, a fila de atendimento e as configurações de equipe. O painel permite acompanhar respostas, prioridades e prazos.',
      },
      {
        kind: 'Melhoria',
        title: 'Acesso de suporte à conta da aluna',
        description:
          'As visitas de atendimento passam a ter limite de tempo, registro das ações e aviso na tela. Cada pessoa da equipe pode manter apenas uma visita aberta por vez.',
      },
      {
        kind: 'Melhoria',
        title: 'Retomada de lojas anteriores',
        description:
          'As lojas salvas destacam a opção de retomar o trabalho. O caminho leva à importação ou à revisão dos produtos daquela loja e explica o que ainda depende de conexão ou liberação.',
      },
      {
        kind: 'Melhoria',
        title: 'Aulas concluídas mais fáceis de encontrar',
        description:
          'A lista do SLL destaca as aulas concluídas em verde, com uma marca de conclusão. A aula atual mantém o destaque roxo.',
      },
    ],
  },
  {
    date: '2026-10-26',
    changes: [
      {
        kind: 'Melhoria',
        title: 'A plataforma passa a se chamar Escala Shop',
        description:
          'O endereço de acesso passa a ser membros.escalashop.com.br. Contas, compras e progresso são preservados, e os links antigos continuam encaminhando para o novo endereço.',
      },
      {
        kind: 'Novo',
        title: 'Catálogo recuperado de lojas anteriores',
        description:
          'Os produtos recuperados podem ser importados para uma lista particular de revisão, com fotos, variações, nomes, descrições e preços. A importação salva rascunhos; a publicação na Shopee ainda depende das regras de liberação.',
      },
      {
        kind: 'Novo',
        title: 'Área independente do curso Zé Mauro',
        description:
          'O curso ganhou navegação e progresso próprios, separados do curso da Pri. As aulas sem gravação fornecida aparecem como “Em breve”.',
      },
      {
        kind: 'Correção',
        title: 'Letras e acentos nos banners',
        description:
          'As fontes usadas na exportação foram incluídas no servidor para corrigir letras ausentes e caracteres em forma de quadradinhos. Os arquivos podem ser gerados novamente na página de banners.',
      },
      {
        kind: 'Melhoria',
        title: 'Compras pendentes da Hotmart',
        description:
          'A administração ganhou avisos e busca de eventos pendentes, com opções de configuração e recuperação das compras elegíveis. Produtos não identificados continuam sem liberar acesso automaticamente.',
      },
    ],
  },
];
