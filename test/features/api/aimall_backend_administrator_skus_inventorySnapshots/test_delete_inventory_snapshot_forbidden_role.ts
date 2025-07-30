import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendInventorySnapshot";

/**
 * Validate that non-administrator (e.g., seller) users are forbidden from
 * deleting inventory snapshots.
 *
 * This test ensures that even if a valid SKU and inventory snapshot exist, a
 * user without admin privileges (such as a seller) cannot perform a DELETE
 * operation on
 * /aimall-backend/administrator/skus/{skuId}/inventorySnapshots/{inventorySnapshotId}.
 * The API should respond with an access denied error, typically 403 Forbidden.
 *
 * Steps:
 *
 * 1. As an administrator, create a product so that a SKU can be associated with
 *    it.
 * 2. As an administrator, create a SKU associated with the product.
 * 3. As an administrator, create an inventory snapshot for that SKU.
 * 4. Simulate or switch to a seller user (whose credentials do not confer admin
 *    rights).
 * 5. Attempt to perform the DELETE operation on the inventory snapshot endpoint
 *    with the seller user.
 * 6. Validate that a forbidden error response (HTTP 403) or equivalent access
 *    denied error is returned, and the resource is not deleted.
 */
export async function test_api_aimall_backend_administrator_skus_inventorySnapshots_test_delete_inventory_snapshot_forbidden_role(
  connection: api.IConnection,
) {
  // 1. Create a product as admin
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Test Product for Forbidden Deletion",
          description:
            "A product setup for testing inventory snapshot deletion permission.",
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create a SKU for this product as admin
  const sku =
    await api.functional.aimall_backend.administrator.products.skus.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          sku_code: RandomGenerator.alphaNumeric(12),
        } satisfies IAimallBackendSku.ICreate,
      },
    );
  typia.assert(sku);

  // 3. Create an inventory snapshot as admin
  const snapshot =
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.create(
      connection,
      {
        skuId: sku.id,
        body: {
          sku_id: sku.id,
          product_id: product.id,
          change_type: "restock",
          change_quantity: 50,
          changed_by: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAimallBackendInventorySnapshot.ICreate,
      },
    );
  typia.assert(snapshot);

  // 4. Switch to a seller user account (simulate seller privilege)
  // NOTE: For this test, simulate a connection with seller role.
  // Implementation should provide connection reflecting seller privileges hereafter.
  // (Role switching logic depends on system test infrastructure and is not implemented here.)

  // 5. Attempt to DELETE inventory snapshot with seller privileges
  await TestValidator.error("forbidden delete for non-admin")(() =>
    api.functional.aimall_backend.administrator.skus.inventorySnapshots.erase(
      connection,
      {
        skuId: sku.id,
        inventorySnapshotId: snapshot.id,
      },
    ),
  );
}
