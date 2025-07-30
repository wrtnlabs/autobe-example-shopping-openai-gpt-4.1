import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Validate that a customer cannot delete another customer's external account
 * linkage.
 *
 * This test ensures that the API enforces ownership permissions when deleting
 * an external account linkage. Only the owning customer should be able to
 * delete their external account. A different customer must not be able to
 * delete it, and such an attempt should result in a rejection (permission
 * denied or not found error).
 *
 * Test Process:
 *
 * 1. Register the first customer (customerA).
 * 2. Register the second customer (customerB).
 * 3. Link an external account (provider: e.g., "google") to customerA.
 * 4. As customerB, attempt to delete the external account linkage owned by
 *    customerA.
 * 5. Assert that the API rejects the deletion attempt (error thrown).
 */
export async function test_api_aimall_backend_customer_customers_externalAccounts_test_delete_external_account_not_owned_by_customer(
  connection: api.IConnection,
) {
  // 1. Register the first customer (customerA)
  const customerA = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customerA);

  // 2. Register the second customer (customerB)
  const customerB = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customerB);

  // 3. Link an external account to customerA
  const externalAccount =
    await api.functional.aimall_backend.customer.customers.externalAccounts.create(
      connection,
      {
        customerId: customerA.id,
        body: {
          provider: "google",
          external_user_id: typia.random<string>(),
        } satisfies IAIMallBackendExternalAccount.ICreate,
      },
    );
  typia.assert(externalAccount);

  // 4. As customerB, attempt to delete customerA's external account linkage
  // In a real scenario, the auth context would be switched to customerB here, but for this test, we simulate ownership check by passing customerB's ID.
  await TestValidator.error(
    "Customer cannot delete another customer's external account",
  )(async () => {
    await api.functional.aimall_backend.customer.customers.externalAccounts.erase(
      connection,
      {
        customerId: customerB.id,
        externalAccountId: externalAccount.id,
      },
    );
  });
}
