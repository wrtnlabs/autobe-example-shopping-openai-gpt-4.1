import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAIMallBackendExternalAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";

/**
 * Validate retrieval of external accounts for a customer with no external
 * accounts attached.
 *
 * This test ensures that when a customer has no external (OAuth) accounts
 * linked (such as Google, Kakao, etc), the API should return an empty data
 * array, not an error. This is critical for a good UX where the customer might
 * want to link an external account but currently has none connected.
 *
 * Steps:
 *
 * 1. Register (create) a new customer using the backend customer registration API.
 *    This new customer is guaranteed to have no external accounts because
 *    they're freshly registered and no linking flow is performed in this test.
 * 2. Fetch external accounts for the newly created customer using the
 *    `/aimall-backend/customer/customers/{customerId}/externalAccounts`
 *    endpoint.
 * 3. Validate that the `data` field is an empty array, and API does not throw any
 *    errors.
 * 4. Validate type safety of the output using typia.assert
 *
 * This ensures the correct system behavior for newly onboarded users before
 * they link any OAuth/external accounts.
 */
export async function test_api_aimall_backend_customer_customers_externalAccounts_index_no_external_accounts(
  connection: api.IConnection,
) {
  // 1. Register a new customer (guaranteed to have no external accounts linked)
  const customerInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    phone: RandomGenerator.mobile(),
    password_hash: null, // No password is set (external accounts only), but here we simply test empty external
    status: "active",
  };
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: customerInput,
    },
  );
  typia.assert(customer);

  // 2. Retrieve external accounts for this customer
  const result =
    await api.functional.aimall_backend.customer.customers.externalAccounts.index(
      connection,
      {
        customerId: customer.id,
      },
    );
  typia.assert(result);

  // 3. Assert empty data list (no external accounts linked)
  TestValidator.equals("should return empty external accounts array")(
    result.data,
  )([]);
}
