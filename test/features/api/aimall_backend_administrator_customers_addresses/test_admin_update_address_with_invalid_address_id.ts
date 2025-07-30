import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * Validate administrator attempt to update a customer's address with an invalid
 * address ID.
 *
 * This test ensures that when an administrator attempts to update an address
 * for a customer using an addressId that does not exist for that customer, the
 * system correctly returns a not found error (e.g., 404), and does not alter
 * any real address records in the database.
 *
 * Test Flow:
 *
 * 1. Register a new customer using the customer API.
 * 2. Prepare valid address update data for use in the update attempt (but do not
 *    actually create an address record).
 * 3. Attempt to update an address for this customer using a random (non-existent)
 *    addressId.
 * 4. Expect the system to raise an error (e.g., 404 not found), and verify that no
 *    successful update occurred.
 */
export async function test_api_aimall_backend_administrator_customers_addresses_test_admin_update_address_with_invalid_address_id(
  connection: api.IConnection,
) {
  // 1. Register a new customer
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

  // 2. Prepare address update input
  const addressUpdate: IAimallBackendAddress.IUpdate = {
    alias: "Invalid Update Test",
    recipient_name: "Test User",
    phone: "010-9999-8888",
    address_line1: "123 Fake Street",
    address_line2: "Suite 404",
    city: "Nowhere",
    postal_code: "00000",
    country: "Korea",
    is_default: false,
    updated_at: new Date().toISOString(),
  };

  // 3. Use random non-existent addressId
  const fakeAddressId = typia.random<string & tags.Format<"uuid">>();

  // 4. Attempt update and expect error (e.g., 404)
  await TestValidator.error("update with non-existent addressId should fail")(
    async () => {
      await api.functional.aimall_backend.administrator.customers.addresses.update(
        connection,
        {
          customerId: customer.id,
          addressId: fakeAddressId,
          body: addressUpdate,
        },
      );
    },
  );
}
