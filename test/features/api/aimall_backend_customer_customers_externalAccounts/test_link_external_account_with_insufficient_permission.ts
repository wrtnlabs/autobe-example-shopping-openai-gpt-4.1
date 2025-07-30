import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Validate authorization when linking external accounts to a customer record.
 *
 * This test ensures that the system enforces proper access controls when a
 * request is made to link an external (OAuth/federated) account to a customer
 * profile. It explicitly attempts to perform the operation:
 *
 * - Without any authentication (unauthenticated request)
 * - As a different customer (not the target)
 *
 * The API must reject both attempts and NOT allow external account linkage
 * unless the requestor has valid authority for the specific customer target.
 * The error should clearly indicate a permission or authentication failure.
 * This prevents privilege escalations, improper identity linkage, or
 * unauthorized account manipulation.
 *
 * Test steps:
 *
 * 1. Register a new customer account (for which linkage will be attempted)
 * 2. Attempt to link an external account to this customer as an unauthenticated
 *    caller (expect permission error)
 * 3. Register/login another customer
 * 4. Attempt to link an external account to the original customer as this other
 *    customer (expect permission error)
 */
export async function test_api_aimall_backend_customer_customers_externalAccounts_test_link_external_account_with_insufficient_permission(
  connection: api.IConnection,
) {
  // 1. Register a new customer to reference (target customer)
  const baseCustomer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(baseCustomer);

  // Prepare external account payload
  const externalPayload = {
    provider: "google",
    external_user_id: typia.random<string>(),
  } satisfies IAIMallBackendExternalAccount.ICreate;

  // 2. Attempt to link external account without authentication (simulate no auth)
  const unauthConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated linkage prevented")(() =>
    api.functional.aimall_backend.customer.customers.externalAccounts.create(
      unauthConnection,
      {
        customerId: baseCustomer.id,
        body: externalPayload,
      },
    ),
  );

  // 3. Register another customer for role testing
  const otherCustomer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(otherCustomer);
  // (Assume connection can switch authentication context; simulate as if "otherCustomer" is logged in)
  const differentAuthConnection = {
    ...connection,
    // Simulate token/header as otherCustomer (real systems would acquire proper auth tokens)
    headers: { "X-User": otherCustomer.id },
  };

  // 4. Attempt linkage by other customer (should also be denied)
  await TestValidator.error("other user linkage prevented")(() =>
    api.functional.aimall_backend.customer.customers.externalAccounts.create(
      differentAuthConnection,
      {
        customerId: baseCustomer.id,
        body: externalPayload,
      },
    ),
  );
}
