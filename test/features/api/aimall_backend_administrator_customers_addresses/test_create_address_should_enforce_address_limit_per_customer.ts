import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * Validates enforcement of the address-per-customer maximum rule by the admin
 * address creation endpoint.
 *
 * This test ensures that the system enforces the business rule that limits the
 * number of delivery addresses each customer can have.
 *
 * Steps:
 *
 * 1. Register a new customer with unique identifiers.
 * 2. Create the maximum number of allowed addresses for the customer (assumed 5).
 * 3. Attempt to add a 6th address, expecting a validation or business rule error.
 * 4. Confirm only the allowed addresses were created (implicit, as only 5
 *    creations succeed).
 *
 * Assumptions:
 *
 * - Maximum allowed addresses per customer is 5 (adjust if the actual business
 *   rule changes).
 * - No address-list API exists for verification, so the test only asserts success
 *   for <=5 addresses and error for the 6th.
 */
export async function test_api_aimall_backend_administrator_customers_addresses_test_create_address_should_enforce_address_limit_per_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const email = typia.random<string & tags.Format<"email">>();
  const phone = "010" + typia.random<string>().slice(0, 8);
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email,
        phone,
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);
  const customerId = customer.id;

  // 2. Create the maximum allowed addresses (5)
  const addresses = ArrayUtil.repeat(5)(
    () =>
      ({
        alias: RandomGenerator.alphaNumeric(8),
        recipient_name: RandomGenerator.name(),
        phone: phone,
        address_line1: RandomGenerator.alphaNumeric(16),
        city: "Seoul",
        postal_code: "06236",
        country: "South Korea",
        is_default: false,
      }) satisfies IAimallBackendAddress.ICreate,
  );
  for (const addr of addresses) {
    const created =
      await api.functional.aimall_backend.administrator.customers.addresses.create(
        connection,
        {
          customerId,
          body: addr,
        },
      );
    typia.assert(created);
  }

  // 3. Attempt to create a 6th address (should fail)
  await TestValidator.error(
    "should reject address exceeding customer address limit",
  )(async () => {
    await api.functional.aimall_backend.administrator.customers.addresses.create(
      connection,
      {
        customerId,
        body: {
          alias: RandomGenerator.alphaNumeric(8),
          recipient_name: RandomGenerator.name(),
          phone: phone,
          address_line1: RandomGenerator.alphaNumeric(16),
          city: "Seoul",
          postal_code: "06236",
          country: "South Korea",
          is_default: false,
        } satisfies IAimallBackendAddress.ICreate,
      },
    );
  });
}
