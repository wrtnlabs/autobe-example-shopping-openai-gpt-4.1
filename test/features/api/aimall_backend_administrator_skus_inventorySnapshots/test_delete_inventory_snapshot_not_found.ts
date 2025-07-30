import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validate error response when attempting to delete a non-existent inventory
 * snapshot for a legitimate SKU as an administrator.
 *
 * Business Context: Administrators may need to clean up inventory snapshots for
 * SKUs occasionally. However, to ensure data integrity and prevent accidental
 * deletion, the system must respond correctly when asked to delete an inventory
 * snapshot that does not exist for a given SKU. According to business rules and
 * scenario requirements, the system must return a 404 error if the specified
 * inventory snapshot id does not exist for the target SKU.
 *
 * Step-by-step process:
 *
 * 1. Create a valid product as context (ensures category_id, seller_id, title,
 *    status, etc. are present).
 * 2. Create a SKU for that product, so SKU context is also valid and matched to
 *    the existing product.
 * 3. Attempt to delete an inventory snapshot on that SKU with a random UUID (not
 *    previously created and should not exist).
 * 4. Verify that the API throws a 404 error (not found) and error handling logic
 *    is correct.
 */
export async function test_api_aimall_backend_administrator_skus_inventorySnapshots_test_delete_inventory_snapshot_not_found(
  connection: api.IConnection,
) {
  // 1. Create fake product
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "E2E Test Product - Delete Snapshot Error",
          description: "Test product for inventory snapshot delete error case.",
          status: "active",
        },
      },
    );
  typia.assert(product);

  // 2. Create a SKU for the product
  const sku =
    await api.functional.aimall_backend.administrator.products.skus.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          sku_code: `E2E-SKU-${typia.random<string & tags.Format<"uuid">>().slice(0, 8)}`,
        },
      },
    );
  typia.assert(sku);

  // 3. Attempt to delete a non-existent inventory snapshot
  await TestValidator.error(
    "should return 404 for non-existent inventory snapshot",
  )(() =>
    api.functional.aimall_backend.administrator.skus.inventorySnapshots.erase(
      connection,
      {
        skuId: sku.id,
        inventorySnapshotId: typia.random<string & tags.Format<"uuid">>(), // never created, so should 404
      },
    ),
  );
}
