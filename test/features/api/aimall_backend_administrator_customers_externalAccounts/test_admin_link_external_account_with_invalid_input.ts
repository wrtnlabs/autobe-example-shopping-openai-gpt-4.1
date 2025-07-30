import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAIMallBackendExternalAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IAIMallBackendExternalAccount";
import type { IAimallBackendAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAdministrator";

/**
 * Validate that the admin-side external account linking returns input
 * validation errors when required payload fields are missing or have invalid
 * types
 *
 * This test ensures that administrators, despite their privileges, cannot
 * bypass business validation logic and must supply all required fields
 * correctly. The test simulates common cases of invalid payload: missing fields
 * and wrong field types.
 *
 * Test Workflow:
 *
 * 1. Create a test customer (required to get a valid customer ID).
 * 2. Create an administrator (required for privileged API access).
 * 3. As admin, attempt to link an external account to the customer with a payload
 *    missing the 'provider' field.
 *
 *    - Expect an error (input validation failure).
 * 4. As admin, attempt to link an external account to the customer with a payload
 *    missing the 'external_user_id' field.
 *
 *    - Expect an error (input validation failure).
 * 5. As admin, attempt to link an external account to the customer with an invalid
 *    'provider' (submitting a non-string type, e.g., number).
 *
 *    - Expect an error (input validation failure).
 * 6. As admin, attempt to link an external account with both required fields but
 *    with invalid values (e.g., empty strings).
 *
 *    - Expect an error (input validation failure).
 */
export async function test_api_aimall_backend_administrator_customers_externalAccounts_test_admin_link_external_account_with_invalid_input(
  connection: api.IConnection,
) {
  // 1. Create a test customer.
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create an admin (NOTE: random permission UUID for test).
  const admin =
    await api.functional.aimall_backend.administrator.administrators.create(
      connection,
      {
        body: {
          permission_id: typia.random<string & tags.Format<"uuid">>(),
          email: typia.random<string>(),
          name: "AdminTestUser",
          status: "active",
        } satisfies IAimallBackendAdministrator.ICreate,
      },
    );
  typia.assert(admin);

  // 3. Payload MISSING 'provider'
  await TestValidator.error("missing provider should fail")(async () => {
    await api.functional.aimall_backend.administrator.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: {
          // provider: intentionally omitted
          external_user_id: "some-id",
        } as any,
      },
    );
  });

  // 4. Payload MISSING 'external_user_id'
  await TestValidator.error("missing external_user_id should fail")(
    async () => {
      await api.functional.aimall_backend.administrator.customers.externalAccounts.create(
        connection,
        {
          customerId: customer.id,
          body: {
            provider: "google",
            // external_user_id: intentionally omitted
          } as any,
        },
      );
    },
  );

  // 5. Invalid 'provider' type (number instead of string)
  await TestValidator.error("invalid provider type (number) should fail")(
    async () => {
      await api.functional.aimall_backend.administrator.customers.externalAccounts.create(
        connection,
        {
          customerId: customer.id,
          body: {
            provider: 1234 as any, // invalid type
            external_user_id: "some-id",
          } as any,
        },
      );
    },
  );

  // 6. Invalid values: empty strings for required fields
  await TestValidator.error("empty fields should fail")(async () => {
    await api.functional.aimall_backend.administrator.customers.externalAccounts.create(
      connection,
      {
        customerId: customer.id,
        body: {
          provider: "",
          external_user_id: "",
        } as any,
      },
    );
  });
}
