import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * E2E test: Successfully delete a customer address as administrator.
 *
 * This test simulates the following workflow as required by business rules:
 *
 * 1. Create a customer (since a customer must exist to register an address).
 * 2. Add an address for this customer.
 * 3. As administrator, delete the registered address using the admin endpoint.
 * 4. Attempt to delete the same address again—confirming that the deletion was
 *    permanent by verifying an error is thrown.
 *
 * Business rationale:
 *
 * - Only administrators or the account owner are permitted to delete addresses
 *   via the admin endpoint.
 * - Address deletions are hard deletes (no soft-deletion) as per model.
 * - Confirmed address removal ensures system data integrity and demonstrates
 *   audit/control policy compliance.
 *
 * Steps:
 *
 * 1. Register a new customer using required, realistic data.
 * 2. Add a delivery address using valid test details.
 * 3. Call the admin hard-delete endpoint.
 * 4. Attempt deletion again and validate error—proving that address is no longer
 *    present.
 */
export async function test_api_aimall_backend_administrator_customers_addresses_test_admin_delete_address_success(
  connection: api.IConnection,
) {
  // 1. Register a test customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: null, // Emulates external-reg scenario
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. Add a delivery address for the customer
  const address =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Home",
          recipient_name: "John Doe",
          phone: typia.random<string>(),
          address_line1: "123 Main St",
          address_line2: "Apt 101",
          city: "Seoul",
          postal_code: "06236",
          country: "KR",
          is_default: true,
        },
      },
    );
  typia.assert(address);

  // 3. Delete the address as admin
  await api.functional.aimall_backend.administrator.customers.addresses.erase(
    connection,
    {
      customerId: customer.id,
      addressId: address.id,
    },
  );

  // 4. Verify deletion by ensuring subsequent delete fails
  await TestValidator.error("re-delete non-existent address")(() =>
    api.functional.aimall_backend.administrator.customers.addresses.erase(
      connection,
      {
        customerId: customer.id,
        addressId: address.id,
      },
    ),
  );
}
