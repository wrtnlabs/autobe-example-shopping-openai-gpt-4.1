import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendInventorySnapshot";
import type { IPageIAimallBackendInventorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendInventorySnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates error handling for invalid filter parameters sent to the
 * inventorySnapshots PATCH endpoint (administrator SKU scope).
 *
 * This test ensures the API returns proper validation errors for deliberately
 * malformed or disallowed filter values in the request body. Only scenarios
 * that are valid TypeScript objects (and allowed by the schema) but violate
 * business or format rules are included:
 *
 * Steps:
 *
 * 1. Use a valid random SKU ID for the path parameter
 * 2. Send filters with intentionally malformed or out-of-bounds values:
 *
 *    - Malformed UUID string for sku_id and product_id
 *    - Negative values and zero for page and limit
 *    - Unlikely filter values for change_type (business-level nonsense)
 * 3. Confirm all such requests yield validation errors, not business success
 */
export async function test_api_aimall_backend_administrator_skus_test_inventory_snapshots_patch_with_invalid_filters_returns_error(
  connection: api.IConnection,
) {
  // 1. Get a valid-looking SKU ID for path param
  const skuId = typia.random<string & tags.Format<"uuid">>();

  // 2a. Filter: sku_id has a malformed UUID string
  await TestValidator.error("sku_id body with non-UUID string must error")(() =>
    api.functional.aimall_backend.administrator.skus.inventorySnapshots.search(
      connection,
      {
        skuId,
        body: {
          sku_id: "12345-not-a-real-uuid",
        },
      },
    ),
  );

  // 2b. product_id: malformed UUID string
  await TestValidator.error("product_id with bad uuid format triggers error")(
    () =>
      api.functional.aimall_backend.administrator.skus.inventorySnapshots.search(
        connection,
        {
          skuId,
          body: {
            product_id: "bad-uuid-format",
          },
        },
      ),
  );

  // 2c. Negative page value (should be >= 1 normally)
  await TestValidator.error("negative page number is rejected")(() =>
    api.functional.aimall_backend.administrator.skus.inventorySnapshots.search(
      connection,
      {
        skuId,
        body: {
          page: -1,
        },
      },
    ),
  );

  // 2d. Zero page (should be at least 1)
  await TestValidator.error("zero page is a validation error")(() =>
    api.functional.aimall_backend.administrator.skus.inventorySnapshots.search(
      connection,
      {
        skuId,
        body: {
          page: 0,
        },
      },
    ),
  );

  // 2e. Negative limit
  await TestValidator.error("negative limit triggers validation error")(() =>
    api.functional.aimall_backend.administrator.skus.inventorySnapshots.search(
      connection,
      {
        skuId,
        body: {
          limit: -10,
        },
      },
    ),
  );

  // 2f. Zero limit
  await TestValidator.error("zero limit is rejected as invalid")(() =>
    api.functional.aimall_backend.administrator.skus.inventorySnapshots.search(
      connection,
      {
        skuId,
        body: {
          limit: 0,
        },
      },
    ),
  );

  // 2g. change_type: extremely unlikely business nonsense input
  await TestValidator.error(
    "nonsense change_type should be rejected or ignored",
  )(() =>
    api.functional.aimall_backend.administrator.skus.inventorySnapshots.search(
      connection,
      {
        skuId,
        body: {
          change_type: "$$$notARealType$$$",
        },
      },
    ),
  );
}
