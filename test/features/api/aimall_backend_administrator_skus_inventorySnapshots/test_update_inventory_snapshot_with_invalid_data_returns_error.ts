import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendInventorySnapshot";

/**
 * Validate the update endpoint's runtime validation logic for inventory
 * snapshot with invalid data.
 *
 * This test ensures the API correctly enforces business rules at the update
 * endpoint by rejecting invalid inventory snapshot updates and does not alter
 * underlying data. Specifically, it covers:
 *
 * - Preventing updates to inventory snapshot using a negative quantity for a
 *   'restock' type event (should be a business logic validation failure)
 *
 * Full business workflow:
 *
 * 1. Create a product (providing category and seller UUIDs, minimal required
 *    fields)
 * 2. Create a SKU tied to that product (unique sku_code)
 * 3. Create an inventory snapshot for the SKU
 * 4. Attempt to update the snapshot with a negative quantity (which should fail)
 * 5. Confirm the API rejects the invalid update by catching an error
 * 6. (Omitted: checking for unmodified data, as there is no API to re-fetch
 *    snapshot by ID)
 */
export async function test_api_aimall_backend_administrator_skus_inventorySnapshots_test_update_inventory_snapshot_with_invalid_data_returns_error(
  connection: api.IConnection,
) {
  // 1. Create product (category/seller IDs, title, status)
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Inventory Validation Product",
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create SKU for that product
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

  // 3. Create an inventory snapshot (as a restock, positive integer)
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

  // 4. Attempt to update with negative quantity (should violate business logic for restock events)
  await TestValidator.error(
    "Negative quantity in restock inventory snapshot update should fail",
  )(async () => {
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.update(
      connection,
      {
        skuId: sku.id,
        inventorySnapshotId: snapshot.id,
        body: {
          change_quantity: -100,
        } satisfies IAimallBackendInventorySnapshot.IUpdate,
      },
    );
  });

  // 5. (Omitted) There is no public API to re-fetch the snapshot by ID, so no post-condition check here.
}
