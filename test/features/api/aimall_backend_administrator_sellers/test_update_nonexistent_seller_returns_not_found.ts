import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";

/**
 * Test that updating a nonexistent seller returns a not found error (404).
 *
 * Scenario:
 *
 * 1. Prepare an update body for a seller using valid, random data for all required
 *    fields.
 * 2. Use a completely random sellerId UUID that does not exist in the
 *    aimall_backend_sellers table.
 * 3. Attempt to update this nonexistent seller via the admin API endpoint.
 * 4. Assert that the API returns a not found error, and that no data is changed.
 * 5. Do not catch TypeScript-level errors regarding missing required fields; only
 *    test runtime not found condition.
 */
export async function test_api_aimall_backend_administrator_sellers_test_update_nonexistent_seller_returns_not_found(
  connection: api.IConnection,
) {
  // Step 1: Prepare random update data
  const updateBody: IAimallBackendSeller.IUpdate = {
    business_name: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "suspended",
    updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
  };

  // Step 2: Prepare random UUID for sellerId that will not exist
  const randomNonexistentSellerId = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 3: Attempt the update and verify that a not found error occurs
  await TestValidator.error("not found error for nonexistent seller")(() =>
    api.functional.aimall_backend.administrator.sellers.update(connection, {
      sellerId: randomNonexistentSellerId,
      body: updateBody,
    }),
  );
}
