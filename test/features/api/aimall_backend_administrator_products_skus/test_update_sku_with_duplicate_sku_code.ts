import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validate SKU sku_code uniqueness on update.
 *
 * In the AIMall backend, each SKU (stock keeping unit) under a product must
 * have a unique sku_code. This test ensures that updating a SKU's sku_code to a
 * value already existing under the same product is not permitted by the
 * system.
 *
 * Test Steps:
 *
 * 1. Create a product.
 * 2. Create two SKUs under this product, each with distinct sku_code values.
 * 3. Attempt to update the second SKU so that its sku_code matches the first SKU's
 *    sku_code.
 * 4. Confirm the update fails with a uniqueness violation error (duplicate
 *    sku_code).
 * 5. (Optional) Check that original SKUs remain unchanged after the failed update
 *    (if GET API is available).
 */
export async function test_api_aimall_backend_administrator_products_skus_test_update_sku_with_duplicate_sku_code(
  connection: api.IConnection,
) {
  // 1. Create a product for SKU assignment
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(3),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create two SKUs with different sku_codes under this product
  const skuCode1 = RandomGenerator.alphaNumeric(8);
  const skuCode2 = RandomGenerator.alphaNumeric(8);
  const sku1 =
    await api.functional.aimall_backend.administrator.products.skus.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          sku_code: skuCode1,
        } satisfies IAimallBackendSku.ICreate,
      },
    );
  typia.assert(sku1);
  const sku2 =
    await api.functional.aimall_backend.administrator.products.skus.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          sku_code: skuCode2,
        } satisfies IAimallBackendSku.ICreate,
      },
    );
  typia.assert(sku2);

  // 3. Attempt to update the second SKU's sku_code to match the first's; expect error
  await TestValidator.error("sku_code uniqueness violation")(() =>
    api.functional.aimall_backend.administrator.products.skus.update(
      connection,
      {
        productId: product.id,
        skuId: sku2.id,
        body: {
          sku_code: skuCode1,
        } satisfies IAimallBackendSku.IUpdate,
      },
    ),
  );

  // 4. (Optional) Could verify original values if GET SKU endpoint is available in the future
}
