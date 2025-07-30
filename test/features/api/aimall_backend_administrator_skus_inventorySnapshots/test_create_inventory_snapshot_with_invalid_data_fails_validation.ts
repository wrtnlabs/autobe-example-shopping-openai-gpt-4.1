import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendInventorySnapshot";

/**
 * Test the creation of an inventory snapshot with invalid data.
 *
 * This test ensures that the POST
 * /aimall-backend/administrator/skus/{skuId}/inventorySnapshots endpoint
 * robustly rejects invalid inventory snapshot requests and provides descriptive
 * validation errors without persisting any data.
 *
 * Scenarios covered:
 *
 * - Negative change_quantity (for business rules that only allow positive numbers
 *   in restocks)
 * - Malformed change_type (not among accepted types)
 *
 * Setup:
 *
 * - Create a valid product record as dependency (simulate a real environment)
 * - Generate a dummy SKU ID (as placeholder; actual SKU validation depends on
 *   backend implementation)
 *
 * Each invalid request is submitted with business-logic-violating payloads.
 * Test succeeds if all are rejected.
 *
 * Note:
 *
 * - Invalid requests for missing required fields cannot be compiled in TypeScript
 *   and are omitted from this runtime E2E.
 * - Only runtime-business-logic failures are tested.
 */
export async function test_api_aimall_backend_administrator_skus_inventorySnapshots_test_create_inventory_snapshot_with_invalid_data_fails_validation(
  connection: api.IConnection,
) {
  // 1. Setup - create a valid product (dependency)
  const validProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Test Product for Inventory Snapshot Validation",
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(validProduct);

  // 2. Dummy SKU ID (simulate non-existent or placeholder SKU)
  const dummySkuId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;

  // 3. Prepare invalid business-logic payloads

  // (a) Negative change_quantity for "restock" (should reject)
  await TestValidator.error(
    "Negative change_quantity in restock should be rejected",
  )(async () => {
    await api.functional.aimall_backend.administrator.skus.inventorySnapshots.create(
      connection,
      {
        skuId: dummySkuId,
        body: {
          sku_id: dummySkuId,
          product_id: validProduct.id,
          change_type: "restock",
          change_quantity: -10,
          changed_by: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IAimallBackendInventorySnapshot.ICreate,
      },
    );
  });

  // (b) Malformed change_type (should reject)
  await TestValidator.error("Malformed change_type should be rejected")(
    async () => {
      await api.functional.aimall_backend.administrator.skus.inventorySnapshots.create(
        connection,
        {
          skuId: dummySkuId,
          body: {
            sku_id: dummySkuId,
            product_id: validProduct.id,
            change_type: "not-a-valid-type",
            change_quantity: 5,
            changed_by: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IAimallBackendInventorySnapshot.ICreate,
        },
      );
    },
  );
}
