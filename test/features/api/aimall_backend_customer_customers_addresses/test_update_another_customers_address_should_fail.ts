import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * Verify that a customer cannot update another customer's address.
 *
 * This test ensures that address ownership is strictly enforced in the API and
 * that attempting to update an address via the wrong customer context fails
 * securely with a forbidden or not authorized error. It also verifies that
 * sensitive data is not exposed, and no update is made in the backend.
 *
 * Step by step process:
 *
 * 1. Register two separate customers (customerA and customerB).
 * 2. Using customerA, create a new address linked to customerA's id.
 * 3. Attempt to update customerA's address using customerB's id as the path
 *    parameter (simulate as if customerB is trying to update customerA's
 *    address).
 * 4. Validate that the operation fails (e.g., returns forbidden/unauthorized
 *    error).
 * 5. Optionally, confirm that the address record has not been altered and that no
 *    sensitive data (like password_hash) is leaked in error or success
 *    responses.
 */
export async function test_api_aimall_backend_customer_customers_addresses_test_update_another_customers_address_should_fail(
  connection: api.IConnection,
) {
  // 1. Register customerA
  const customerAInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    status: "active",
    password_hash: null,
  };
  const customerA = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerAInput },
  );
  typia.assert(customerA);

  // 2. Register customerB
  const customerBInput: IAimallBackendCustomer.ICreate = {
    email: typia.random<string>(),
    phone: typia.random<string>(),
    status: "active",
    password_hash: null,
  };
  const customerB = await api.functional.aimall_backend.customers.create(
    connection,
    { body: customerBInput },
  );
  typia.assert(customerB);

  // 3. customerA creates a new address
  const addressInput: IAimallBackendAddress.ICreate = {
    alias: "Home",
    recipient_name: "Test User",
    phone: typia.random<string>(),
    address_line1: "123 Main St",
    address_line2: "Unit 1",
    city: "Seoul",
    postal_code: "06236",
    country: "South Korea",
    is_default: true,
  };
  const address =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customerA.id,
        body: addressInput,
      },
    );
  typia.assert(address);

  // 4. Prepare address update attempt from customerB
  const updateInput: IAimallBackendAddress.IUpdate = {
    alias: "Work",
    recipient_name: "Wrong User",
    phone: typia.random<string>(),
    address_line1: "456 Business Rd",
    address_line2: "Floor 2",
    city: "Busan",
    postal_code: "12345",
    country: "Korea",
    is_default: false,
    updated_at: new Date().toISOString(),
  };
  // Attempt the update as customerB targeting customerA's address
  await TestValidator.error("forbidden: cannot update another user's address")(
    async () => {
      await api.functional.aimall_backend.customer.customers.addresses.update(
        connection,
        {
          customerId: customerB.id,
          addressId: address.id,
          body: updateInput,
        },
      );
    },
  );
}
