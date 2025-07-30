import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendExternalAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Test error handling when retrieving external accounts for a nonexistent
 * customerId.
 *
 * Ensures that a request for external accounts using a non-existent customerId
 * does not return data, but instead results in an appropriate error (such as
 * 404 Not Found). This test helps confirm the endpoint's resilience against
 * invalid input and guards against unintentional data leakage.
 *
 * Steps:
 *
 * 1. Generate a random UUID for customerId that should not exist in the system.
 * 2. Attempt to retrieve external accounts for this UUID via the administrator
 *    endpoint.
 * 3. Validate that the API returns an error (ideally 404 Not Found), not normal
 *    data.
 * 4. Ensure no external account data is returned under any circumstance for this
 *    input.
 */
export async function test_api_aimall_backend_administrator_customers_externalAccounts_index_retrieve_for_nonexistent_customer(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID to use as a fake, nonexistent customer ID
  const fakeCustomerId: string = typia.random<string & tags.Format<"uuid">>();

  // 2 & 3. Attempt to query the endpoint and ensure error is thrown, not data returned
  await TestValidator.error(
    "Should throw Not Found error for nonexistent customerId",
  )(async () => {
    await api.functional.aimall_backend.administrator.customers.externalAccounts.index(
      connection,
      { customerId: fakeCustomerId },
    );
  });
}
