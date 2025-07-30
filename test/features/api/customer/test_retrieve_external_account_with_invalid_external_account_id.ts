import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Validate external account access control for customers.
 *
 * This test verifies that when a customer queries for an external account (via
 * externalAccountId) that either does not exist, or is not linked to the
 * customerId, the API returns a 404 error (or system-defined equivalent). This
 * guards against resource leakage and ensures unauthorized access controls on
 * federated accounts are enforced.
 *
 * Process:
 *
 * 1. Register a new customer with no external accounts linked.
 * 2. Attempt to retrieve a random external account for this customerId that cannot
 *    exist in their account (random uuid).
 * 3. Assert that the response throws an error of type HttpError and (status code
 *    is 404 or appropriate business error).
 */
export async function test_api_customer_test_retrieve_external_account_with_invalid_external_account_id(
  connection: api.IConnection,
) {
  // 1. Register a new customer with no external accounts.
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Attempt to retrieve a random (non-existent) externalAccountId for this customer.
  const randomExternalAccountId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("404 for non-existent external account")(
    async () => {
      await api.functional.aimall_backend.customer.customers.externalAccounts.at(
        connection,
        {
          customerId: customer.id,
          externalAccountId: randomExternalAccountId,
        },
      );
    },
  );
}
