import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * Validate error when requesting a nonexistent address for a valid customer.
 *
 * Business context: Only addresses actually registered to a customer (by ID)
 * can be queried via the endpoint. Fetching an addressId not present for the
 * customer must return a not-found error, not a successful empty object.
 *
 * Steps:
 *
 * 1. Create a new customer using the API (dependency, to get a valid customerId).
 * 2. Generate a random addressId (UUID) that is guaranteed NOT to exist for this
 *    customer.
 * 3. Attempt to GET
 *    /aimall-backend/customer/customers/{customerId}/addresses/{addressId} with
 *    this nonexistent addressId.
 * 4. Verify that an error is thrown, indicating the address does not exist for the
 *    specified customer (not-found error).
 */
export async function test_api_aimall_backend_test_get_customer_address_nonexistent_addressId(
  connection: api.IConnection,
) {
  // 1. Create a valid customer
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

  // 2. Generate a random (non-existent) addressId
  const nonexistentAddressId = typia.random<string & tags.Format<"uuid">>();

  // 3. Attempt to retrieve the address by nonexistent addressId (should throw error)
  await TestValidator.error(
    "Should throw not-found error for nonexistent address",
  )(async () => {
    await api.functional.aimall_backend.customer.customers.addresses.at(
      connection,
      {
        customerId: customer.id,
        addressId: nonexistentAddressId,
      },
    );
  });
}
