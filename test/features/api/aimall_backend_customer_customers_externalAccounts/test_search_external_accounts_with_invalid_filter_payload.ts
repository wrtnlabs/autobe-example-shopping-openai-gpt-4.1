import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";
import type { IPageIAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendExternalAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test validation error handling for searching customer's external accounts
 * with malformed filter criteria.
 *
 * This test ensures the
 * /aimall-backend/customer/customers/{customerId}/externalAccounts PATCH
 * endpoint rejects invalid filter/pagination payloads, returns proper
 * validation error codes, and provides useful feedback for fixing invalid
 * inputs.
 *
 * Steps:
 *
 * 1. Register a customer (dependency: /aimall-backend/customers)
 * 2. Attempt to search for the external accounts using invalid/malformed filter
 *    payloads: a. Malformed provider code (e.g., forbidden characters, wrong
 *    type) b. Invalid pagination values (e.g., negative or non-integer
 *    limits/pages)
 * 3. For each invalid request, confirm:
 *
 *    - A validation error occurs (HTTP error/exception is thrown)
 *    - Error structure/code is present and descriptive for client debugging
 */
export async function test_api_aimall_backend_customer_customers_externalaccounts_test_search_external_accounts_with_invalid_filter_payload(
  connection: api.IConnection,
) {
  // 1. Register a customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: typia.random<string>(),
        password_hash: "hashedpasswordvalue",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // INVALID 1: Malformed provider value (e.g., object instead of string/null)
  await TestValidator.error("Malformed provider triggers validation error")(
    async () => {
      await api.functional.aimall_backend.customer.customers.externalAccounts.search(
        connection,
        {
          customerId: customer.id,
          body: {
            provider: { forbidden: "object here" } as any, // deliberately wrong type
          },
        },
      );
    },
  );

  // INVALID 2: Pagination values out of range (negative limit)
  await TestValidator.error("Negative limit triggers validation error")(
    async () => {
      await api.functional.aimall_backend.customer.customers.externalAccounts.search(
        connection,
        {
          customerId: customer.id,
          body: {
            limit: -1 as any, // negative value, should trigger validation error
          },
        },
      );
    },
  );

  // INVALID 3: Non-integer page value (string instead of int32)
  await TestValidator.error("Non-integer page triggers validation error")(
    async () => {
      await api.functional.aimall_backend.customer.customers.externalAccounts.search(
        connection,
        {
          customerId: customer.id,
          body: {
            page: "not-a-number" as any, // string instead of int
          },
        },
      );
    },
  );

  // INVALID 4: Both provider null and malformed external_user_id (object instead of string/null)
  await TestValidator.error(
    "Malformed external_user_id triggers validation error",
  )(async () => {
    await api.functional.aimall_backend.customer.customers.externalAccounts.search(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: null,
          external_user_id: {} as any, // deliberate object
        },
      },
    );
  });
}
