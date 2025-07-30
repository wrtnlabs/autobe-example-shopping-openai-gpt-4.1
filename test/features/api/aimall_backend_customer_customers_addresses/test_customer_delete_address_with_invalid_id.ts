import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";

/**
 * Test customer address deletion with an invalid addressId.
 *
 * This test verifies the backend behavior when a customer attempts to delete an
 * address using an invalid or non-existent addressId. The expected outcome is
 * that the system should return a "not found" error, and no customer addresses
 * should be deleted. This is essential for validating input robustness and
 * ensuring integrity of customer address data when facing bad input or
 * potential URL tampering. Only the features available in the provided SDK are
 * tested.
 *
 * Steps:
 *
 * 1. Register a customer using the backend registration API (dependency setup).
 * 2. Attempt to delete an address for this customer using a random UUID
 *    (non-existent addressId).
 * 3. Confirm that the appropriate error is thrown and that no records are actually
 *    deleted (as far as can be observed with the SDK).
 */
export async function test_api_aimall_backend_customer_customers_addresses_test_customer_delete_address_with_invalid_id(
  connection: api.IConnection,
) {
  // 1. Register a customer with plausible random data
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Attempt to delete an address for this new customer with a non-existent addressId
  const nonExistentAddressId = typia.random<string & tags.Format<"uuid">>();
  // The generated UUID addressId will not belong to this new customer, ensuring the not-found scenario

  // 3. Ensure a not found error is thrown
  await TestValidator.error(
    "should return not found error on invalid address delete",
  )(async () => {
    await api.functional.aimall_backend.customer.customers.addresses.erase(
      connection,
      {
        customerId: customer.id,
        addressId: nonExistentAddressId,
      },
    );
  });
}
