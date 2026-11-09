import { DOMParser, XMLSerializer, type Document, type Element } from '@xmldom/xmldom';
import JSZip from 'jszip';
import { z } from 'zod';
import type { DeliveryOffer } from './assisted-delivery';

const column = z.string().regex(/^[A-Z]{1,2}$/);
const layoutSchema = z
  .object({
    worksheet: z.string().regex(/^xl\/worksheets\/sheet[1-9]\d*\.xml$/),
    firstRow: z.number().int().min(2).max(100),
    anchor: z.object({
      cell: z.string().regex(/^[A-Z]{1,2}[1-9]\d{0,2}$/),
      text: z.string().min(1),
    }),
    columns: z.object({
      sku: column,
      title: column,
      description: column,
      category: column,
      price: column,
      stock: column,
      weight: column,
      length: column,
      width: column,
      height: column,
      brand: column.optional(),
      images: z.array(column).min(1).max(9),
      attributes: z.record(z.string().regex(/^[1-9]\d*$/), column).default({}),
    }),
  })
  .refine(({ columns: { images, attributes, ...fields } }) => {
    const used = [
      ...Object.values(fields).filter(Boolean),
      ...images,
      ...Object.values(attributes),
    ];
    return new Set(used).size === used.length;
  });

export type DeliveryWorkbookLayout = z.infer<typeof layoutSchema>;

export function parseDeliveryWorkbookLayout(raw: string | undefined) {
  try {
    return layoutSchema.parse(JSON.parse(raw ?? ''));
  } catch {
    return null;
  }
}

export function fitsDeliveryWorkbook(offer: DeliveryOffer, layout: DeliveryWorkbookLayout) {
  return (
    (!offer.brandId || Boolean(layout.columns.brand)) &&
    offer.attributes.every((attribute) => Boolean(layout.columns.attributes[attribute.id]))
  );
}

const SHEET = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const XML_SPACE = 'http://www.w3.org/XML/1998/namespace';
const MAX_TEMPLATE_BYTES = 8 * 1024 * 1024;

function parseXml(xml: string) {
  if (xml.length > MAX_TEMPLATE_BYTES || /<!DOCTYPE/i.test(xml))
    throw new Error('Invalid workbook XML.');
  return new DOMParser({
    onError: (_level, message) => {
      throw new Error(message);
    },
  }).parseFromString(xml, 'application/xml');
}

function columnNumber(value: string) {
  return [...value].reduce((result, letter) => result * 26 + letter.charCodeAt(0) - 64, 0);
}

function writeCell(
  doc: Document,
  row: Element,
  name: string,
  number: number,
  value: string | number,
) {
  const ref = `${name}${number}`;
  const cells = Array.from(row.getElementsByTagNameNS(SHEET, 'c'));
  const cell =
    cells.find((item) => item.getAttribute('r') === ref) ?? doc.createElementNS(SHEET, 'c');
  if (cell.parentNode && (cell.textContent || cell.getElementsByTagNameNS(SHEET, 'f').length))
    throw new Error('The workbook template contains a value in a product cell.');
  if (!cell.parentNode) {
    const next = cells.find(
      (item) =>
        columnNumber((item.getAttribute('r') ?? '').replace(/\d/g, '')) > columnNumber(name),
    );
    cell.setAttribute('r', ref);
    row.insertBefore(cell, next ?? null);
  }
  while (cell.firstChild) cell.removeChild(cell.firstChild);
  if (typeof value === 'number') {
    cell.setAttribute('t', 'n');
    const node = doc.createElementNS(SHEET, 'v');
    node.appendChild(doc.createTextNode(String(value)));
    cell.appendChild(node);
  } else {
    // Inline strings keep SKUs literal and never turn supplier text into formulas.
    cell.setAttribute('t', 'inlineStr');
    const inline = doc.createElementNS(SHEET, 'is');
    const node = doc.createElementNS(SHEET, 't');
    node.setAttributeNS(XML_SPACE, 'xml:space', 'preserve');
    // eslint-disable-next-line no-control-regex
    node.appendChild(doc.createTextNode(value.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')));
    inline.appendChild(node);
    cell.appendChild(inline);
  }
}

/** Fill the operator's original template without rebuilding its other tabs or metadata. */
export async function fillDeliveryWorkbook(
  template: Uint8Array,
  layout: DeliveryWorkbookLayout,
  offers: readonly DeliveryOffer[],
) {
  if (template.byteLength > MAX_TEMPLATE_BYTES || offers.length < 1 || offers.length > 5)
    throw new Error('Invalid workbook template or delivery size.');
  const zip = await JSZip.loadAsync(template);
  const sheet = zip.file(layout.worksheet);
  if (!sheet || !zip.file('xl/workbook.xml')) throw new Error('Workbook sheet missing.');
  const doc = parseXml(await sheet.async('string'));
  const data = doc.getElementsByTagNameNS(SHEET, 'sheetData')[0];
  const marker = Array.from(doc.getElementsByTagNameNS(SHEET, 'c')).find(
    (cell) => cell.getAttribute('r') === layout.anchor.cell,
  );
  const value = marker?.getElementsByTagNameNS(SHEET, 'v')[0]?.textContent;
  const shared = marker?.getAttribute('t') === 's' && zip.file('xl/sharedStrings.xml');
  const anchor = shared
    ? parseXml(await shared.async('string')).getElementsByTagNameNS(SHEET, 'si')[Number(value)]
        ?.textContent
    : (value ?? marker?.textContent);
  if (!data || anchor !== layout.anchor.text) throw new Error('Unexpected workbook template.');

  for (const [index, offer] of offers.entries()) {
    if (!fitsDeliveryWorkbook(offer, layout))
      throw new Error('Product requires additional fields.');
    const number = layout.firstRow + index;
    const rows = Array.from(data.getElementsByTagNameNS(SHEET, 'row'));
    let row = rows.find((item) => Number(item.getAttribute('r')) === number);
    if (!row) {
      row = doc.createElementNS(SHEET, 'row');
      row.setAttribute('r', String(number));
      const next = rows.find((item) => Number(item.getAttribute('r')) > number);
      data.insertBefore(row, next ?? null);
    }
    const c = layout.columns;
    const cells: [string, string | number][] = [
      [c.sku, offer.sku],
      [c.title, offer.title],
      [c.description, offer.description],
      [c.category, offer.categoryId],
      [c.price, offer.priceCents / 100],
      [c.stock, offer.stock],
      [c.weight, offer.weightGrams / 1000],
      [c.length, offer.dimensionsCm.length],
      [c.width, offer.dimensionsCm.width],
      [c.height, offer.dimensionsCm.height],
    ];
    if (c.brand && offer.brandId) cells.push([c.brand, offer.brandId]);
    for (const [photoIndex, photoColumn] of c.images.entries()) {
      const url = offer.images[photoIndex];
      if (url) cells.push([photoColumn, url]);
    }
    for (const attribute of offer.attributes) {
      const field = c.attributes[attribute.id];
      if (field)
        cells.push([field, attribute.values.map((item) => item.name || item.id).join(', ')]);
    }
    for (const [field, contents] of cells) writeCell(doc, row, field, number, contents);
  }
  // The optional cached range can be smaller than the newly filled cells.
  const dimension = doc.getElementsByTagNameNS(SHEET, 'dimension')[0];
  dimension?.parentNode?.removeChild(dimension);
  zip.file(layout.worksheet, new XMLSerializer().serializeToString(doc));
  return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
}
