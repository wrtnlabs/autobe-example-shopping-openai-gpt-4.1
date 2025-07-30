import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendExternalAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Test error scenario for fetching external accounts with an invalid or
 * non-existent customerId.
 *
 * This test ensures that the API robustly denies access or returns a 404 Not
 * Found when a customer attempts to retrieve external account links for a
 * customerId that does not exist. This protects customer privacy and confirms
 * that cross-customer data is not inadvertently leaked.
 *
 * Step-by-step procedure:
 *
 * 1. Prepare a random UUID that is extremely unlikely to correspond to a real
 *    customer (simulate a non-existent customerId).
 * 2. Attempt to fetch external account links for this invalid customerId using the
 *    customer/external accounts endpoint.
 * 3. Validate that the API either throws an HTTP error (ideally 404 Not Found or
 *    403 Forbidden).
 * 4. Confirm that no external account data is returned (the call fails, or the
 *    response is an empty or error payload).
 * 5. (If possible with the SDK/framework) Use TestValidator.error to assert that
 *    the request fails as expected for invalid access.
 */
export async function test_api_aimall_backend_customer_customers_externalAccounts_index_test_list_external_accounts_for_invalid_customer(
  connection: api.IConnection,
) {
  // Step 1: Prepare a non-existent customerId
  const invalidCustomerId = typia.random<string & tags.Format<"uuid">>();

  // Step 2 & 3: Attempt fetch and expect an error (privacy/robustness)
  await TestValidator.error(
    "access denied or not found for invalid customerId",
  )(async () => {
    await api.functional.aimall_backend.customer.customers.externalAccounts.index(
      connection,
      {
        customerId: invalidCustomerId,
      },
    );
  });
}
