import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IPageIAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAddress";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * Validate empty address list for newly created customer
 *
 * This test verifies that when a customer account is created but has no
 * delivery addresses yet, the address list API correctly returns an empty data
 * array and proper pagination metadata without error.
 *
 * Steps:
 *
 * 1. Create a new customer account (with no delivery addresses)
 * 2. Request delivery address list for the new customer
 * 3. Validate that the response pagination totals and data array are all
 *    zero/empty
 */
export async function test_api_aimall_backend_customer_customers_addresses_test_get_customer_addresses_no_addresses_registered(
  connection: api.IConnection,
) {
  // 1. Create a new customer account (with no delivery addresses)
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        status: "active",
        // password_hash explicitly omitted (nullable/optional)
      },
    },
  );
  typia.assert(customer);

  // 2. Request delivery address list for this customer
  const addressPage =
    await api.functional.aimall_backend.customer.customers.addresses.index(
      connection,
      {
        customerId: customer.id,
      },
    );
  typia.assert(addressPage);

  // 3. Validate pagination and data array
  TestValidator.equals("empty addresses: records")(
    addressPage.pagination.records,
  )(0);
  TestValidator.equals("empty addresses: pages")(addressPage.pagination.pages)(
    0,
  );
  TestValidator.predicate("empty address data array")(
    Array.isArray(addressPage.data) && addressPage.data.length === 0,
  );
}
