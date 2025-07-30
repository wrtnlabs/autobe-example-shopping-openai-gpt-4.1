import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Verify that a customer cannot update an external account they do not own.
 *
 * This test validates that external account linkage updates are only allowed by
 * the owning customer. If a second customer tries to update an external account
 * attached to the first customer, the API must respond with an error (such as
 * permission denied or not-found), and the original account link must remain
 * unchanged.
 *
 * Step-by-step flow:
 *
 * 1. Register the first customer with unique credentials
 * 2. Link an external account to the first customer
 * 3. Register a second customer
 * 4. Attempt (as the second customer) to update the first customer's external
 *    account linkage
 * 5. Expect an error (permission/ownership/404). Verification that the record did
 *    not change is not possible since no "read external" endpoint exists in the
 *    provided SDK.
 */
export async function test_api_aimall_backend_customer_customers_externalAccounts_test_update_external_account_not_owned_by_customer(
  connection: api.IConnection,
) {
  // 1. Register the first customer
  const firstCustomerEmail = typia.random<string & tags.Format<"email">>();
  const firstCustomer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: firstCustomerEmail,
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphaNumeric(24),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(firstCustomer);

  // 2. Link an external account to the first customer
  const externalAccount: IAIMallBackendExternalAccount =
    await api.functional.aimall_backend.customer.customers.externalAccounts.create(
      connection,
      {
        customerId: firstCustomer.id,
        body: {
          provider: "google",
          external_user_id: RandomGenerator.alphaNumeric(16),
        } satisfies IAIMallBackendExternalAccount.ICreate,
      },
    );
  typia.assert(externalAccount);

  // 3. Register the second customer
  const secondCustomerEmail = typia.random<string & tags.Format<"email">>();
  const secondCustomer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: secondCustomerEmail,
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphaNumeric(24),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(secondCustomer);

  // 4. Attempt to update the first customer's external account as the second customer
  await TestValidator.error(
    "customer cannot update external account not owned by them",
  )(async () => {
    await api.functional.aimall_backend.customer.customers.externalAccounts.update(
      connection,
      {
        customerId: secondCustomer.id,
        externalAccountId: externalAccount.id,
        body: {
          provider: "kakao",
          external_user_id: RandomGenerator.alphaNumeric(16),
        } satisfies IAIMallBackendExternalAccount.IUpdate,
      },
    );
  });

  // 5. Verification of unchanged link skipped (no GET/read API for external account provided)
}
