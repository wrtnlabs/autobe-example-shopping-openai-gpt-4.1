import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendInventorySnapshot";

/**
 * Test successful deletion of an inventory snapshot as an administrator.
 *
 * Validates that administrators can delete inventory snapshots linked to a SKU,
 * by following full entity dependency workflow:
 *
 * 1. Create a product (to be the parent for a SKU)
 * 2. Register a SKU under the product
 * 3. Insert an inventory snapshot for the SKU
 * 4. Delete the inventory snapshot using the DELETE endpoint
 * 5. (Confirmation via GET is omitted as no GET endpoint is provided.)
 *
 * This test ensures resource dependencies, deletion logic, and type safety,
 * using only available SDK and DTOs. If GET endpoints existed, test would
 * verify the deleted snapshot is no longer retrievable.
 */
export async function test_api_aimall_backend_administrator_skus_inventorySnapshots_test_delete_inventory_snapshot_success(
  connection: api.IConnection,
) {
  // 1. Create a product
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          main_thumbnail_uri: RandomGenerator.alphaNumeric(16),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Register a SKU under the product
  const sku =
    await api.functional.aimall_backend.administrator.products.skus.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          sku_code: RandomGenerator.alphaNumeric(8),
        } satisfies IAimallBackendSku.ICreate,
      },
    );
  typia.assert(sku);

  // 3. Insert an inventory snapshot for the SKU
  const snapshot =
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.create(
      connection,
      {
        skuId: sku.id,
        body: {
          sku_id: sku.id,
          product_id: product.id,
          change_type: "restock",
          change_quantity: 10,
          changed_by: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAimallBackendInventorySnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 4. Delete the inventory snapshot by ID
  await api.functional.aimall_backend.administrator.skus.inventorySnapshots.erase(
    connection,
    {
      skuId: sku.id,
      inventorySnapshotId: snapshot.id,
    },
  );
  // No GET endpoint to re-confirm deletion; assume success if no error thrown
}
