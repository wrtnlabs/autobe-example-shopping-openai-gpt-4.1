import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Test the hard deletion of a SKU (Stock Keeping Unit) by its unique identifier
 * as an administrator.
 *
 * This test ensures that:
 *
 * 1. A SKU created for a real product can be deleted by an administrator.
 * 2. The deletion is a hard delete (no soft deletion field, item is fully
 *    removed).
 * 3. After deletion, the SKU cannot be accessed or queried anymore (simulated by
 *    negative delete), confirming removal.
 * 4. The API properly responds to redundant delete calls (should throw not found
 *    or similar error).
 *
 * Step-by-step process:
 *
 * 1. Create a product using the administrator endpoint (dependency for SKU).
 * 2. Create a SKU for the product.
 * 3. Delete the SKU by its id.
 * 4. Attempt to delete the same SKU again, must fail (proves hard delete).
 * 5. (Omitted: query/dependency cascade checks as there are no such endpoints
 *    provided)
 */
export async function test_api_aimall_backend_administrator_skus_test_delete_sku_success(
  connection: api.IConnection,
) {
  // 1. Create a product (dependency for SKU creation)
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create a SKU for this product
  const sku = await api.functional.aimall_backend.administrator.skus.create(
    connection,
    {
      body: {
        product_id: product.id,
        sku_code: RandomGenerator.alphaNumeric(12),
      } satisfies IAimallBackendSku.ICreate,
    },
  );
  typia.assert(sku);

  // 3. Delete the SKU by its id
  await api.functional.aimall_backend.administrator.skus.erase(connection, {
    skuId: sku.id,
  });

  // 4. Negative test: Try to delete again; should fail (simulate inability to delete nonexistent)
  await TestValidator.error("delete same SKU twice must error")(() =>
    api.functional.aimall_backend.administrator.skus.erase(connection, {
      skuId: sku.id,
    }),
  );
}
