import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validate referential integrity for SKU creation – product_id foreign key must
 * reference an existing product.
 *
 * This test attempts to create a new SKU using a product_id that does **not**
 * correspond to any existing product in the database. The expectation is that
 * the API will enforce referential integrity and reject this operation.
 *
 * Steps:
 *
 * 1. Construct a random UUID intended to represent a non-existent product_id.
 * 2. Attempt to create a SKU using this non-existent product_id and a randomly
 *    generated valid sku_code.
 * 3. Assert that the API request fails (i.e., throws an error or rejects the
 *    request) due to foreign key or validation error.
 *
 * This ensures that the API prevents SKU creation unless the referenced product
 * actually exists in the catalog.
 */
export async function test_api_aimall_backend_administrator_skus_test_create_sku_with_nonexistent_product(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID that is extremely unlikely to correspond to any existing product
  const nonexistentProductId = typia.random<string & tags.Format<"uuid">>();
  const skuCode = `${nonexistentProductId.slice(0, 8)}-INVALID`;

  // 2. Attempt to create a SKU referencing that non-existent product
  await TestValidator.error("should fail for nonexistent product foreign key")(
    async () => {
      await api.functional.aimall_backend.administrator.skus.create(
        connection,
        {
          body: {
            product_id: nonexistentProductId,
            sku_code: skuCode,
          } satisfies IAimallBackendSku.ICreate,
        },
      );
    },
  );
}
