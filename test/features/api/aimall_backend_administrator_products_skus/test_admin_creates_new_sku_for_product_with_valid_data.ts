import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validates that an administrator can successfully create a SKU for a product.
 *
 * Business context:
 *
 * - SKUs are variants belonging to a product. Each SKU must be associated with an
 *   existing product (by product_id) and have a unique sku_code.
 * - Administrators use this endpoint to add new purchasable variants to the
 *   catalog.
 *
 * Why this test is necessary:
 *
 * - Ensures the API allows admins to create SKUs for valid products, and verifies
 *   the system links the SKU correctly.
 * - Guards against regressions that break core catalog management workflows.
 *
 * Step-by-step process:
 *
 * 1. Create a seller (administrator privilege) so a product can be assigned an
 *    owner.
 * 2. Create a product, assigning it to the created seller.
 * 3. As administrator, create a SKU for the product, providing a unique sku_code
 *    and referencing the existing product ID.
 * 4. Assert that the returned SKU contains the expected product_id and sku_code.
 */
export async function test_api_aimall_backend_administrator_products_skus_test_admin_creates_new_sku_for_product_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a seller (admin privilege)
  const sellerData = {
    business_name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  } satisfies IAimallBackendSeller.ICreate;
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: sellerData,
      },
    );
  typia.assert(seller);

  // 2. Create a product owned by the new seller
  const productData = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    title: RandomGenerator.paragraph()(),
    description: RandomGenerator.content()()(),
    status: "active",
  } satisfies IAimallBackendProduct.ICreate;
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: productData,
    },
  );
  typia.assert(product);

  // 3. As admin, create a SKU using a unique sku_code for that product
  const sku_code = "SKU-" + RandomGenerator.alphaNumeric(8);
  const skuBody = {
    product_id: product.id,
    sku_code,
  } satisfies IAimallBackendSku.ICreate;
  const sku =
    await api.functional.aimall_backend.administrator.products.skus.create(
      connection,
      {
        productId: product.id,
        body: skuBody,
      },
    );
  typia.assert(sku);

  // 4. Assertions to confirm the SKU is bound to the correct product and code
  TestValidator.equals("sku product id matches")(sku.product_id)(product.id);
  TestValidator.equals("sku_code matches")(sku.sku_code)(sku_code);
}
