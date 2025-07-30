import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * Validate that creating an address for a non-existent customer fails (admin
 * endpoint).
 *
 * This test verifies that the API prevents creation of a delivery address for a
 * customerId that does not exist, returning an appropriate not-found error. No
 * address should be created for the non-existent customer.
 *
 * Steps:
 *
 * 1. Generate a random UUID for customerId that does not belong to any customer in
 *    the system.
 * 2. Attempt to create a new address by calling the admin address creation API
 *    with the fake customerId and random payload.
 * 3. Validate that the API call fails with a not found error (e.g., 404), and that
 *    the error structure is appropriate.
 * 4. Make sure that the error does not result in creation of any address record
 *    (no further verification possible unless additional endpoints exist).
 */
export async function test_api_aimall_backend_administrator_customers_addresses_test_create_address_for_nonexistent_customer_should_fail(
  connection: api.IConnection,
) {
  // 1. Prepare a non-existent customerId (random UUID)
  const fakeCustomerId: string = typia.random<string & tags.Format<"uuid">>();
  // 2. Assemble a valid address creation payload
  const addressCreate: IAimallBackendAddress.ICreate =
    typia.random<IAimallBackendAddress.ICreate>();
  // 3. Attempt to create the address - should error (404)
  await TestValidator.error("should fail for non-existent customer")(
    async () => {
      await api.functional.aimall_backend.administrator.customers.addresses.create(
        connection,
        {
          customerId: fakeCustomerId,
          body: addressCreate,
        },
      );
    },
  );
}
