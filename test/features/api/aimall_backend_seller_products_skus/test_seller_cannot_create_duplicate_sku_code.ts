import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validate that a seller cannot create two SKUs with the same sku_code for the
 * same product.
 *
 * This test covers the business rule that sku_code must be unique for each
 * product under a seller. Steps:
 *
 * 1. Create a seller (via admin endpoint)
 * 2. Create a product for the seller
 * 3. Create an initial SKU for this product with a specific sku_code
 * 4. Attempt to create a second SKU for the same product using the same sku_code
 * 5. Assert that the 2nd creation call fails due to duplicate sku_code
 */
export async function test_api_aimall_backend_seller_products_skus_test_seller_cannot_create_duplicate_sku_code(
  connection: api.IConnection,
) {
  // 1. Create a seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create a product for seller
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(),
        description: RandomGenerator.content()()(),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. Create the first SKU with unique sku_code
  const skuCode = RandomGenerator.alphaNumeric(10);
  const sku1 = await api.functional.aimall_backend.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: {
        product_id: product.id,
        sku_code: skuCode,
      } satisfies IAimallBackendSku.ICreate,
    },
  );
  typia.assert(sku1);
  TestValidator.equals("SKU code matches")(sku1.sku_code)(skuCode);

  // 4. Attempt to create a second SKU with the duplicated sku_code
  await TestValidator.error("Duplicated sku_code should be rejected")(() =>
    api.functional.aimall_backend.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        product_id: product.id,
        sku_code: skuCode,
      } satisfies IAimallBackendSku.ICreate,
    }),
  );
}
