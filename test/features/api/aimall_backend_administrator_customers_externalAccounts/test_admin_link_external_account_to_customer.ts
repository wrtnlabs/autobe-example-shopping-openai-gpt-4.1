import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Validate administrator ability to link a new external (OAuth/federated)
 * account to a customer.
 *
 * This test confirms that an admin can successfully associate an external
 * identity for a customer—commonly required for account recovery, merging, or
 * customer support cases.
 *
 * Steps:
 *
 * 1. Register a customer account using the POST /aimall-backend/customers endpoint
 *    (required fields: email, phone, status, [optional: password_hash]).
 * 2. Create an administrator using POST
 *    /aimall-backend/administrator/administrators (provide permission_id,
 *    email, name, and status—simulate a valid permission reference if needed).
 * 3. (Assume current connection already has admin privileges; if not, call admin
 *    login—but API for that is not present, so skip token switching.)
 * 4. As admin, POST
 *    /aimall-backend/administrator/customers/{customerId}/externalAccounts with
 *    a newly generated provider name and external_user_id, linking an account.
 * 5. Validate the response: returned IAIMallBackendExternalAccount must be linked
 *    to the correct customer ID, match provider/external_user_id, and have a
 *    valid UUID and linked_at timestamp.
 * 6. (If an external account listing API existed, call it and verify the account
 *    appears; no such API present, so skip.)
 *
 * Edge cases: • If an attempt is made to link the same
 * external_user_id/provider to another customer, it should fail (out-of-scope
 * for this test due to lack of error-case requirements).
 *
 * Implementation maintains strict type safety, uses only actually provided
 * parameters, and performs validation according to the DTO and API contracts.
 */
export async function test_api_aimall_backend_administrator_customers_externalAccounts_test_admin_link_external_account_to_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    status: "active",
    // password_hash intentionally omitted for simulating external-linked accounts
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerInput },
  );
  typia.assert(customer);

  // 2. Register an administrator (simulate valid permission FK with random UUID)
  const adminInput: IAimallBackendAdministrator.ICreate = {
    permission_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string>(),
    name: "Admin Test User",
    status: "active",
  };
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      { body: adminInput },
    );
  typia.assert(admin);
  // For this E2E scenario, we presume the connection is already privileged (no login required)

  // 3. Link a new external account to the customer
  const linkInput: IAIMallBackendExternalAccount.ICreate = {
    provider: "test_provider",
    external_user_id: typia.random<string>(),
  };
  const externalAccount =
    await api.functional.aimall_backend.administrator.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: linkInput,
      },
    );
  typia.assert(externalAccount);

  // 4. Validate response fields and referential integrity
  TestValidator.equals("Linked customer ID matches")(
    externalAccount.customer_id,
  )(customer.id);
  TestValidator.equals("Provider matches")(externalAccount.provider)(
    linkInput.provider,
  );
  TestValidator.equals("External user ID matches")(
    externalAccount.external_user_id,
  )(linkInput.external_user_id);
  TestValidator.predicate("ID is UUID v4 format")(
    typeof externalAccount.id === "string" && externalAccount.id.length === 36,
  );
  TestValidator.predicate("Linked at is ISO8601")(
    !!Date.parse(externalAccount.linked_at),
  );
}
