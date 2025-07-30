import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";

/**
 * Validate retrieval of the customer summary when system is empty.
 *
 * This test ensures that when the aimall-backend administrator customer listing
 * endpoint is called in a freshly provisioned or reset environment (with zero
 * customer records), it returns a null or undefined result—not an error,
 * malformed data, or unexpected structure.
 *
 * Step-by-step process:
 *
 * 1. Precondition: No customers exist in the DB (isolated/clean env, no creation
 *    steps)
 * 2. Call the /aimall-backend/administrator/customers GET endpoint
 * 3. Assert the result is null or undefined, which is the expected output when no
 *    customers exist
 */
export async function test_api_aimall_backend_administrator_customers_index_when_no_customers(
  connection: api.IConnection,
) {
  // 1. Precondition: There must be no customers (run as first test in isolated DB)
  // Test assumes database reset/clean state; do NOT create customers first

  // 2. Call the administrator customer summary list endpoint
  const output =
    await api.functional.aimall_backend.administrator.customers.index(
      connection,
    );

  // 3. Assert output is null or undefined (since there are no customers)
  TestValidator.predicate(
    "should return null or undefined when no customers exist",
  )(output === null || output === undefined);
}
