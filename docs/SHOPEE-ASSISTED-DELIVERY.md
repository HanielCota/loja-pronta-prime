# Assisted Loja Pronta delivery

The customer creates and confirms her own name, logo and description. Once her Shopee seller
account is ready, she can approve the first five suggested offers and request assisted delivery.
The support queue at `/admin/entregas` is restricted to support agents, supervisors and
administrators. An operator confirms the seller account and subaccount permissions before
claiming a request. The queue provides the approved logo and one workbook for bulk upload.
The operator records active listing IDs and confirms that the brand was applied. The dashboard
shows completion only once all five distinct listings and the brand have been confirmed.

## Pilot setup

1. Download the current Brazilian **Adicionar em Massa** template from the Shopee Seller Centre.
   Upload the clean workbook to private application storage under `shopee-templates/`.
   Set `SHOPEE_ASSISTED_TEMPLATE_KEY` to the full key.
2. Set `SHOPEE_ASSISTED_SUBACCOUNT` to the support account identifier that the customer uses
   to share seller permissions. Validate the invitation process, profile editing and product
   publishing with the pilot account.
3. Set `SHOPEE_ASSISTED_TEMPLATE_LAYOUT` to a JSON object mapping the exact pilot workbook.
   `worksheet` is the worksheet XML path inside the workbook. `firstRow` is the first product
   row. `anchor` specifies a known unchanged cell and its exact text. The example illustrates
   the configuration shape. Replace every position and header with the verified template.

   ```json
   {
     "worksheet": "xl/worksheets/sheet1.xml",
     "firstRow": 6,
     "anchor": { "cell": "A2", "text": "SKU" },
     "columns": {
       "sku": "A",
       "title": "B",
       "description": "C",
       "category": "D",
       "price": "E",
       "stock": "F",
       "weight": "G",
       "length": "H",
       "width": "I",
       "height": "J",
       "images": ["K", "L"],
       "brand": "M",
       "attributes": { "123": "N" }
     }
   }
   ```

4. Set `SHOPEE_ASSISTED_SUPPLIER_ID` to the selected supplier's catalog ID. If it matches an
   existing `SUPPLIER_FEEDS` source, the worker refreshes that catalog even before any student
   connects to Shopee. An administrator can also import that supplier's product records via
   `/admin/assistente` without store-specific publication mappings.
   Confirm that five simple, distinct products have current prices and stock, Shopee categories,
   compatible attributes and authorized, publicly accessible HTTPS images. The layout writes
   currency in reais, weight in kilograms and dimensions in centimeters. Attribute values
   use names when supplied, with IDs as the fallback. Verify these representations, photo
   URLs, all category-specific fields and the import result in the actual Seller Centre.
5. Set `SHOPEE_ASSISTED_DELIVERY_ENABLED=true` for the controlled rollout. The two automatic
   publication flags must be off to accept new requests. Disable the assisted flag to pause
   intake while preserving the existing queue. Completed and pending assisted requests
   protect the account from creating a second initial batch through the automatic path.

The first version accepts products without variations. The supplier needs to keep the catalog
current. Approval pins the product data and price, and exports use the latest in-stock quantity.
When the supplier data changes before an operator claims the request, the customer can review
the updated offers. After a partial upload, confirm the active listing IDs before generating the
remaining rows. If the remaining offers are stale or out of stock, the download is held until the
approved offers are available again. Review the store's existing SKUs in Shopee before retrying.
