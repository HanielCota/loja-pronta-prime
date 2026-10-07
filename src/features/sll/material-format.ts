export type SllMaterialKind =
  'pdf' | 'spreadsheet' | 'archive' | 'document' | 'presentation' | 'text' | 'file';

export type SllMaterialFormat = {
  kind: SllMaterialKind;
  label: string;
};

/** Arquivos têm prioridade quando a aula também inclui links ou imagens. */
export function libraryMaterialLabel(
  blocks: Array<{ kind: string; data: unknown }> | undefined,
): string | null {
  if (!blocks?.length) return null;
  const valid = blocks.filter(({ data }) => typeof data === 'object' && data !== null);
  if (valid.some(({ kind, data }) => kind === 'file' && 'fileName' in (data as object)))
    return 'Material da aula';
  if (valid.some(({ kind, data }) => kind === 'link' && 'label' in (data as object)))
    return 'Link da aula';
  if (valid.some(({ kind }) => kind === 'image')) return 'Imagem da aula';
  return null;
}

/** Identifica o formato pelo nome e pelo tipo guardado, sem confiar só no texto da interface. */
export function describeSllMaterial(
  fileName: string,
  contentType?: string | null,
): SllMaterialFormat {
  const extension = fileName.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? '';
  const type = contentType?.toLowerCase() ?? '';

  if (extension === '.pdf' || type === 'application/pdf') return { kind: 'pdf', label: 'PDF' };
  if (
    extension === '.xlsx' ||
    extension === '.xls' ||
    type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    type === 'application/vnd.ms-excel'
  )
    return { kind: 'spreadsheet', label: extension === '.xls' ? 'XLS' : 'XLSX' };
  if (extension === '.zip' || type === 'application/zip') return { kind: 'archive', label: 'ZIP' };
  if (
    extension === '.docx' ||
    type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  )
    return { kind: 'document', label: 'DOCX' };
  if (
    extension === '.pptx' ||
    type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  )
    return { kind: 'presentation', label: 'PPTX' };
  if (extension === '.txt' || extension === '.csv' || type.startsWith('text/'))
    return { kind: 'text', label: extension === '.csv' ? 'CSV' : 'TXT' };
  return { kind: 'file', label: 'Arquivo' };
}
