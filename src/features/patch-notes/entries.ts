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
    date: '2026-10-29',
    changes: [
      {
        kind: 'Correção',
        title: 'Vencimento dos acessos liberados no painel',
        description:
          'Após a publicação e a atualização do banco, liberar um produto ou criar uma conta com acesso passa a exigir um prazo por produto. A compra original pode ser usada para calcular um ano, sem reiniciar a validade. Acessos antigos sem data aparecem para revisão; a conferência pelos registros de compra precisa ser executada separadamente. Importar lojas antigas deixa de criar acesso sem vencimento.',
      },
    ],
  },
  {
    date: '2026-10-28',
    changes: [
      {
        kind: 'Melhoria',
        title: 'Pedidos de privacidade pelo WhatsApp',
        description:
          'Após a publicação desta atualização, os dois contatos da Política de Privacidade passam a usar o WhatsApp configurado para acesso e suporte. A página deixa de oferecer links de e-mail e orienta como enviar pedidos sobre dados pessoais pelo WhatsApp.',
      },
      {
        kind: 'Melhoria',
        title: 'Contatos de suporte somente pelo WhatsApp',
        description:
          'Após a publicação desta atualização, o perfil deixa de oferecer contato com o suporte por e-mail. A ajuda para trocar o e-mail e continuar um acesso usa o WhatsApp configurado para acesso e erros. Sem número configurado, não há encaminhamento para e-mail.',
      },
      {
        kind: 'Melhoria',
        title: 'Atendimento concentrado no WhatsApp',
        description:
          'Após a publicação desta atualização, o atendimento passa a ser pelo WhatsApp. As telas de chamados, os formulários e a fila da equipe são retirados. Os contatos continuam no perfil e na ajuda para entrar; os registros anteriores ficam preservados.',
      },
      {
        kind: 'Melhoria',
        title: 'Relatórios do suporte com menos processamento',
        description:
          'Após a publicação desta atualização, o relatório de desempenho passa a organizar os dados por chamado e reaproveitar os cálculos da mesma consulta. Isso reduz o processamento de históricos maiores, mantendo as regras de notas, prazos e retornos.',
      },
      {
        kind: 'Melhoria',
        title: 'Banners reaproveitam a mesma prévia',
        description:
          'Após a publicação desta atualização, prévias e downloads da mesma versão passam a reaproveitar a imagem pronta. A geração simultânea tem limite para reduzir picos de memória. O acesso à conta e a aprovação para baixar continuam sendo conferidos a cada pedido.',
      },
      {
        kind: 'Correção',
        title: 'Recursos liberados ao preparar fotos',
        description:
          'Após a publicação desta atualização, a preparação de fotos e logos libera os recursos de imagem também quando o navegador não consegue concluir o processamento.',
      },
      {
        kind: 'Melhoria',
        title: 'Menos processamento quando o banco está indisponível',
        description:
          'Após a publicação desta atualização, o limite temporário em memória evita repetir verificações completas quando está cheio. Os limites ativos continuam preservados.',
      },
      {
        kind: 'Correção',
        title: 'Gravação e limite dos chamados',
        description:
          'Após a publicação desta atualização, envios simultâneos passam a respeitar o limite de três chamados abertos. As respostas do suporte também passam a usar a mesma conexão do banco durante a gravação, evitando falhas quando vários envios chegam juntos.',
      },
      {
        kind: 'Correção',
        title: 'Anexos preservados quando o link falha',
        description:
          'Após a publicação desta atualização, uma falha ao enviar o link de acesso não apaga os anexos de um chamado já salvo. Repetir o mesmo envio tenta mandar o link novamente, sem abrir outro chamado.',
      },
      {
        kind: 'Correção',
        title: 'Conferência do estoque das variações',
        description:
          'Após a publicação desta atualização, a ativação dos anúncios também confere o estoque de cada variação. Estoques diferentes ou ausentes pedem conferência. A publicação real continua dependendo das liberações e do piloto da integração.',
      },
      {
        kind: 'Melhoria',
        title: 'Carregamento das aulas do Zé Mauro',
        description:
          'Após a publicação desta atualização, o curso reaproveita o catálogo publicado e carrega o conteúdo completo apenas da aula aberta. O acesso e o progresso continuam sendo conferidos por conta.',
      },
      {
        kind: 'Correção',
        title: 'Estabilidade na atualização do fornecedor',
        description:
          'Após a publicação desta atualização, falhas ao encerrar uma atualização do fornecedor deixam de manter uma conexão do banco ocupada. A disponibilidade do catálogo continua dependendo da configuração e dos dados reais do fornecedor.',
      },
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
