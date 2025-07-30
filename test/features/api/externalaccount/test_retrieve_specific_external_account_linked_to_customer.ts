import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Validate retrieval of a specific external account linked to a customer.
 *
 * This test ensures that after registering a customer and linking a Google
 * account as an external provider, the system allows fetching of the exact
 * external account's details using both customerId and externalAccountId. Key
 * properties like provider, external_user_id, and linked_at are checked for
 * correctness and correspondence.
 *
 * Steps:
 *
 * 1. Register a new customer using the customer creation API
 * 2. Link a Google account to this customer using the corresponding POST endpoint
 *    (provider='google', external_user_id=random unique)
 * 3. Retrieve this external account by GET
 *    /customer/customers/{customerId}/externalAccounts/{externalAccountId}
 * 4. Assert the fetched data matches what was linked (provider, external_user_id,
 *    customerId, etc)
 */
export async function test_api_externalaccount_test_retrieve_specific_external_account_linked_to_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const email: string = typia.random<string & tags.Format<"email">>();
  const phone: string = RandomGenerator.mobile();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email,
        phone,
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. Link Google account
  const provider = "google";
  const external_user_id = RandomGenerator.alphaNumeric(24);
  const linked =
    await api.functional.aimall_backend.customer.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: {
          provider,
          external_user_id,
        },
      },
    );
  typia.assert(linked);
  TestValidator.equals("provider matches")(linked.provider)(provider);
  TestValidator.equals("external_user_id matches")(linked.external_user_id)(
    external_user_id,
  );
  TestValidator.equals("customer id matches")(linked.customer_id)(customer.id);

  // 3. Retrieve by ID
  const fetched =
    await api.functional.aimall_backend.customer.customers.externalAccounts.at(
      connection,
      {
        customerId: customer.id,
        externalAccountId: linked.id,
      },
    );
  typia.assert(fetched);
  TestValidator.equals("provider same")(fetched.provider)(provider);
  TestValidator.equals("external_user_id same")(fetched.external_user_id)(
    external_user_id,
  );
  TestValidator.equals("customer_id same")(fetched.customer_id)(customer.id);
  TestValidator.equals("external_account_id same")(fetched.id)(linked.id);
  // The linked_at field should be a valid datetime (equality may be strict)
  TestValidator.equals("linked_at same")(fetched.linked_at)(linked.linked_at);
}
