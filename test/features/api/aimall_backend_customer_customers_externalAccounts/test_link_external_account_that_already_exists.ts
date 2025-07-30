import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Validate uniqueness constraint when linking external accounts to customers.
 *
 * This test ensures that the system correctly rejects attempts to link an
 * external (OAuth/social) account to a second customer when it is already bound
 * to a different customer. The uniqueness of (provider, external_user_id) per
 * customer is critical to prevent account hijacking and maintain data
 * integrity.
 *
 * Test Workflow:
 *
 * 1. Register the first customer (customer1).
 * 2. Register the second customer (customer2).
 * 3. Link a unique external account (specific provider, external_user_id) to
 *    customer1 successfully.
 * 4. Attempt to link the identical external account (same provider,
 *    external_user_id) to customer2.
 * 5. Validate that the system rejects the second linking attempt with a
 *    uniqueness/conflict error (runtime error must occur).
 */
export async function test_api_aimall_backend_customer_customers_externalAccounts_test_link_external_account_that_already_exists(
  connection: api.IConnection,
) {
  // 1. Register the first customer
  const customer1Email = typia.random<string & tags.Format<"email">>();
  const customer1Phone = RandomGenerator.mobile();
  const customer1: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customer1Email,
        phone: customer1Phone,
        password_hash: "hashedpassword1",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer1);

  // 2. Register the second customer
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2Phone = RandomGenerator.mobile();
  const customer2: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customer2Email,
        phone: customer2Phone,
        password_hash: "hashedpassword2",
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer2);

  // 3. Link a unique external account to customer1
  const provider = "google";
  const externalUserId = typia.random<string>();
  const externalAccount: IAIMallBackendExternalAccount =
    await api.functional.aimall_backend.customer.customers.externalAccounts.create(
      connection,
      {
        customerId: customer1.id,
        body: {
          provider,
          external_user_id: externalUserId,
        } satisfies IAIMallBackendExternalAccount.ICreate,
      },
    );
  typia.assert(externalAccount);

  // 4. Attempt to link the same external account to customer2 (should fail)
  await TestValidator.error("duplicate external account uniqueness check")(
    async () => {
      await api.functional.aimall_backend.customer.customers.externalAccounts.create(
        connection,
        {
          customerId: customer2.id,
          body: {
            provider,
            external_user_id: externalUserId,
          } satisfies IAIMallBackendExternalAccount.ICreate,
        },
      );
    },
  );
}
