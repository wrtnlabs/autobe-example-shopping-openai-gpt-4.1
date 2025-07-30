import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendInventorySnapshot";

/**
 * Test successful deletion (hard delete) of an inventory snapshot as an
 * administrator.
 *
 * Business context: Inventory snapshots record each stock change for SKUs, with
 * hard delete allowed only by admins due to audit/sensitivity requirements.
 * This test simulates a real workflow in which a new product and SKU are set
 * up, an inventory snapshot is created, and then that snapshot is deleted by an
 * administrator, verifying proper authorization and cleanup.
 *
 * Steps performed:
 *
 * 1. Create a product as required by the SKU schema
 * 2. Create a SKU under that product
 * 3. Create an inventory snapshot for the SKU (the target to delete)
 * 4. Verify snapshot exists (type assertion)
 * 5. Delete the inventory snapshot (using erase API)
 * 6. (Optional) If there were listing APIs, confirm it is not present anymore
 * 7. If no further list API, at least confirm no error is thrown and workflow
 *    completes
 *
 * Success is defined by absence of errors and correct API contract through
 * whole flow.
 */
export async function test_api_aimall_backend_administrator_skus_inventorySnapshots_test_delete_inventory_snapshot_success_admin_authorized(
  connection: api.IConnection,
) {
  // 1. Create a product (required for SKU linkage)
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          // main_thumbnail_uri is optional; can be omitted or provided
          status: RandomGenerator.pick([
            "active",
            "inactive",
            "out_of_stock",
            "deleted",
          ]),
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create a SKU under the product
  const sku =
    await api.functional.aimall_backend.administrator.products.skus.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          sku_code: RandomGenerator.alphaNumeric(10),
        } satisfies IAimallBackendSku.ICreate,
      },
    );
  typia.assert(sku);

  // 3. Create an inventory snapshot for the SKU
  const inventorySnapshot =
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.create(
      connection,
      {
        skuId: sku.id,
        body: {
          sku_id: sku.id,
          product_id: product.id,
          change_type: RandomGenerator.pick([
            "restock",
            "sale",
            "manual_adjust",
          ]),
          change_quantity: typia.random<number & tags.Type<"int32">>(),
          changed_by: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAimallBackendInventorySnapshot.ICreate,
      },
    );
  typia.assert(inventorySnapshot);

  // 4. (Type assertion above already verifies existence)

  // 5. Delete the inventory snapshot
  await api.functional.aimall_backend.administrator.skus.inventorySnapshots.erase(
    connection,
    {
      skuId: sku.id,
      inventorySnapshotId: inventorySnapshot.id,
    },
  );

  // 6-7. No list/at endpoint to confirm non-existence, so just verify no error is thrown
}
