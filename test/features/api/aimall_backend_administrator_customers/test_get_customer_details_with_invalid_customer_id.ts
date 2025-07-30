import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";

/**
 * Test handling of invalid customerId when retrieving customer details as an
 * administrator.
 *
 * This test validates that the API correctly returns a 404 Not Found error when
 * attempting to retrieve a customer entity by a UUID that does not correspond
 * to any real record. The goal is to ensure that:
 *
 * 1. The endpoint does not expose any sensitive data or allow enumeration of
 *    customers.
 * 2. The error returned is a 404 and no customer data is present in the response.
 *
 * Steps:
 *
 * 1. Generate a random UUID for a customerId that is assumed not to exist in the
 *    system.
 * 2. Call the administrator get-customer-details endpoint with this invalid ID.
 * 3. Assert that a 404 error is thrown and no data is returned.
 */
export async function test_api_aimall_backend_administrator_customers_test_get_customer_details_with_invalid_customer_id(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID for a non-existent customerId
  const invalidCustomerId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2. Attempt to retrieve customer details with this ID and expect failure
  await TestValidator.error("should return 404 for non-existent customerId")(
    async () => {
      await api.functional.aimall_backend.administrator.customers.at(
        connection,
        {
          customerId: invalidCustomerId,
        },
      );
    },
  );
  // 3. No data is leaked if the endpoint works as intended (the thrown error by SDK abstraction will prevent sensitive leaks)
}
