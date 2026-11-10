# Assisted Loja Pronta delivery

The customer creates and confirms her own name, logo and description. Once her Shopee seller
account is ready, she can approve the first five suggested offers and request assisted delivery.
The support queue at `/admin/entregas` is restricted to support agents, supervisors and
administrators. With the first approval, the customer submits the login ID and password of a
member created through Shopee's sub-account platform. An operator uses that access to confirm the
seller account and its permissions before claiming a request. The queue provides the approved logo and one workbook for bulk upload.
The operator records active listing IDs and confirms that the brand was applied. The dashboard
shows completion only once all five distinct listings and the brand have been confirmed.

## Pilot setup

Choose one participating member and one authorized live Brazilian shop. Deploy the pilot build
with migration `0076_assisted-store-deliveries` applied and keep intake closed during setup.

1. Download the current Brazilian **Adicionar em Massa** template from the Shopee Seller Centre.
   Upload the clean workbook to private application storage under `shopee-templates/`.
   Set `SHOPEE_ASSISTED_TEMPLATE_KEY` to the full key.
2. Validate the customer access steps on `/loja-pronta/entrega` with the pilot shop. They follow
   Shopee's guide "Como cadastrar Subcontas" (June 2026): in the Seller Centre, Loja >
   Configurações da Loja > Conta e Segurança > Gerenciamento de Subconta > Vincular > Usar conta
   principal; then, on `https://subaccount.shopee.com/`, authorize the pending shop and create a
   member with the Merchandiser role for that shop. Confirm that the Merchandiser role can edit
   the shop profile and add products in bulk, and whether the first member login asks for a code
   sent to the phone registered on the member. Adjust the on-screen steps if Shopee changed a
   label. The password is encrypted with a key derived from `BETTER_AUTH_SECRET`, visible to the
   unclaimed delivery or to its operator, and cleared on completion.
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
5. Set `SHOPEE_ASSISTED_PILOT_USER_ID` to the member's internal Escala Shop user ID and
   `SHOPEE_ASSISTED_PILOT_SHOP_URL` to the shop's public `https://shopee.com.br/shop/<id>` URL.
   The server accepts new requests only from that member and for that shop. Keep
   `SHOPEE_PUBLICATION_ENABLED` and `SHOPEE_BRAND_PUBLICATION_ENABLED` off and set
   `SHOPEE_ASSISTED_DELIVERY_ENABLED=true` once the other settings are ready. Disable the assisted
   flag to pause intake while preserving the existing queue. Completed and pending assisted
   requests protect the account from creating a second initial batch through the automatic path.

## Pilot acceptance

Sign in as the designated member to approve the five offers. Sign in separately as the operator
and confirm the seller account ID and permission to edit the profile and publish in bulk. Apply
the approved brand and upload the generated workbook using the member access. Verify each
SKU, price, stock and active listing ID in the Seller Centre, then record the five distinct IDs
and confirm the brand in `/admin/entregas`. Verify that the member sees **Sua loja está pronta**.

The first version accepts products without variations. The supplier needs to keep the catalog
current. Approval pins the product data and price, and exports use the latest in-stock quantity.
When supplier data changes before an operator claims the request, the customer can review the
updated offers. After a partial upload, record the active listing IDs before generating the
remaining rows. If a claimed delivery has stale offers, an administrator can request new approval
for the remaining items. The administrator must verify that the Seller Centre has no upload in
progress and that every active listing from this delivery has been recorded. The original brand,
confirmed SKUs and listing IDs are retained. Another operator can claim the delivery after the
customer approves the replacements. When the offers are still current, an administrator can
release an assigned delivery to another operator after the same verification.
