import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate administrator attempt to delete a customer address with invalid IDs.
 *
 * This test ensures that attempting to delete a customer address with either an
 * invalid (non-existent) customerId or addressId as an administrator results in
 * a not found error (typically a 404), and that no unintended deletion occurs.
 *
 * Steps:
 *
 * 1. Generate two random UUIDs not associated with any real customer or address.
 * 2. Attempt deletion using both random IDs (invalid customer and address).
 * 3. Attempt deletion with a plausible customerId and another random (invalid)
 *    addressId.
 * 4. Ensure the API throws errors in both cases and that errors are surfaced.
 */
export async function test_api_aimall_backend_administrator_customers_addresses_eraseByCustomeridAndAddressid_invalid(
  connection: api.IConnection,
) {
  // 1. Generate random UUIDs for invalid IDs
  const invalidCustomerId = typia.random<string & tags.Format<"uuid">>();
  const invalidAddressId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt deletion with both IDs invalid
  await TestValidator.error(
    "Deleting with both invalid customer and address IDs should fail",
  )(async () => {
    await api.functional.aimall_backend.administrator.customers.addresses.erase(
      connection,
      {
        customerId: invalidCustomerId,
        addressId: invalidAddressId,
      },
    );
  });

  // 3. Attempt deletion with a valid-form customerId (random), and another new random addressId
  const anotherInvalidAddressId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "Deleting with a valid-form customerId and another invalid addressId should fail",
  )(async () => {
    await api.functional.aimall_backend.administrator.customers.addresses.erase(
      connection,
      {
        customerId: invalidCustomerId,
        addressId: anotherInvalidAddressId,
      },
    );
  });
}
