import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Validate admin can retrieve specific external account details linked to a
 * customer.
 *
 * This test verifies an administrator can fetch full details of an external
 * account linkage for a given customer.
 *
 * Workflow:
 *
 * 1. Register a new customer (with random but valid fields).
 * 2. Admin links a new Apple external account to that customer.
 * 3. Admin fetches details of that specific external account using
 *    customerId+externalAccountId.
 * 4. Confirms fields: provider and external_user_id should match the Apple linking
 *    step, and all date/id fields are valid.
 *
 * Business rationale: Ensures admin access to federated credential details
 * across customers, required for audits and account management.
 */
export async function test_api_aimall_backend_administrator_customers_externalAccounts_retrieve_specific_external_account_details(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerCreate = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
    password_hash: RandomGenerator.alphaNumeric(64),
    status: "active",
  } satisfies IAimallBackendCustomer.ICreate;
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: customerCreate,
    },
  );
  typia.assert(customer);

  // 2. Admin links an Apple external account for that customer
  const extAccountData = {
    provider: "apple",
    external_user_id: RandomGenerator.alphaNumeric(22),
  } satisfies IAIMallBackendExternalAccount.ICreate;
  const linkedExt =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: extAccountData,
      },
    );
  typia.assert(linkedExt);
  TestValidator.equals("provider matches after link")(linkedExt.provider)(
    extAccountData.provider,
  );
  TestValidator.equals("external user id matches")(linkedExt.external_user_id)(
    extAccountData.external_user_id,
  );
  TestValidator.equals("customer id matches")(linkedExt.customer_id)(
    customer.id,
  );

  // 3. Admin retrieves the external account by its id & customer id
  const retrievedExt =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.at(
      connection,
      {
        customerId: customer.id,
        externalAccountId: linkedExt.id,
      },
    );
  typia.assert(retrievedExt);

  // 4. Validate all retrieved fields
  TestValidator.equals("provider matches")(retrievedExt.provider)(
    extAccountData.provider,
  );
  TestValidator.equals("external user id matches")(
    retrievedExt.external_user_id,
  )(extAccountData.external_user_id);
  TestValidator.equals("customer id matches")(retrievedExt.customer_id)(
    customer.id,
  );
  TestValidator.equals("id matches")(retrievedExt.id)(linkedExt.id);
}
