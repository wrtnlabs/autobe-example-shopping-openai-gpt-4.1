import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendInventorySnapshot";

/**
 * Ensure that attempting to create an inventory snapshot for a non-existent SKU
 * returns an error.
 *
 * Business context: It's important for inventory integrity that snapshots are
 * not created for SKUs that don't exist. If a request is made to create a
 * snapshot for a non-existent SKU, the system must reject it (typically with a
 * 404 or referential integrity constraint error), safeguarding against
 * audit/tracking errors and phantom records.
 *
 * Test process:
 *
 * 1. Generate a random UUID as skuId that is very unlikely to exist in the DB.
 * 2. Attempt to create an inventory snapshot for that random skuId.
 *
 *    - The request should use valid structure for all fields except that skuId
 *         refers to a non-existent SKU.
 * 3. Confirm that the system rejects this request with an error (such as 404 or a
 *    foreign key constraint violation), and does NOT create any record.
 *
 * Edge cases/validation:
 *
 * - All other fields should be well-formed and valid, to ensure the error thrown
 *   is solely due to SKU non-existence.
 */
export async function test_api_aimall_backend_administrator_skus_inventorySnapshots_test_create_inventory_snapshot_for_nonexistent_sku_returns_error(
  connection: api.IConnection,
) {
  // Step 1: Generate a random/non-existent SKU ID (UUID format)
  const fakeSkuId: string = typia.random<string & tags.Format<"uuid">>();

  // Step 2: Prepare a valid inventory snapshot creation payload (using the fake SKU, but otherwise valid)
  const payload: IAimallBackendInventorySnapshot.ICreate = {
    sku_id: fakeSkuId,
    product_id: typia.random<string & tags.Format<"uuid">>(),
    change_type: "manual_adjust",
    change_quantity: 15,
    changed_by: typia.random<string & tags.Format<"uuid">>(),
  };

  // Step 3: Attempt creation and expect rejection
  await TestValidator.error("should fail for non-existent skuId")(async () => {
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.create(
      connection,
      {
        skuId: fakeSkuId,
        body: payload,
      },
    );
  });
}
