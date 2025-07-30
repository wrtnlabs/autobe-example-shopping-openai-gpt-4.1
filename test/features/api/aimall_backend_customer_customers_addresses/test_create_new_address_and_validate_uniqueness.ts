import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * Validate creation and uniqueness of customer delivery addresses (is_default
 * constraint).
 *
 * Business context: Customers can create multiple delivery addresses but only
 * one per customer can be set as default at a time. This test ensures that
 * endpoint logic correctly enforces this uniqueness, properly associates the
 * address to the customer, and respects all defined constraints and response
 * types.
 *
 * Process:
 *
 * 1. Register a new customer.
 * 2. Add first address with is_default: true.
 * 3. Add second address with is_default: false.
 * 4. Add third address with is_default: true (should make previous defaults
 *    false).
 * 5. Assert every response for correctness: linkage to customer, uniqueness of
 *    default status, and address field integrity.
 *
 * Limitations: Due to lack of address listing API, can only infer status via
 * returned responses, not by listing all addresses.
 */
export async function test_api_aimall_backend_customer_customers_addresses_test_create_new_address_and_validate_uniqueness(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: typia.random<string>(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Add first address with is_default: true
  const address1 =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Home",
          recipient_name: RandomGenerator.name(),
          phone: typia.random<string>(),
          address_line1: "123 Main St",
          city: "Seoul",
          postal_code: "12345",
          country: "South Korea",
          is_default: true,
        } satisfies IAimallBackendAddress.ICreate,
      },
    );
  typia.assert(address1);
  TestValidator.equals("first address is default")(address1.is_default)(true);
  TestValidator.equals("linkage to customer")(address1.customer_id)(
    customer.id,
  );

  // 3. Add second address with is_default: false
  const address2 =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Work",
          recipient_name: RandomGenerator.name(),
          phone: typia.random<string>(),
          address_line1: "456 Office Blvd",
          city: "Seoul",
          postal_code: "54321",
          country: "South Korea",
          is_default: false,
        } satisfies IAimallBackendAddress.ICreate,
      },
    );
  typia.assert(address2);
  TestValidator.equals("second address non-default")(address2.is_default)(
    false,
  );

  // 4. Add third address with is_default: true (should override previous default)
  const address3 =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Parents",
          recipient_name: RandomGenerator.name(),
          phone: typia.random<string>(),
          address_line1: "789 Parent Lane",
          city: "Seoul",
          postal_code: "11223",
          country: "South Korea",
          is_default: true,
        } satisfies IAimallBackendAddress.ICreate,
      },
    );
  typia.assert(address3);
  TestValidator.equals("third address is default")(address3.is_default)(true);
  TestValidator.equals("linkage to customer")(address3.customer_id)(
    customer.id,
  );

  // 5. Due to lack of address listing API, can't directly confirm all prior default addresses unset. Can only check is_default on responses.
}
