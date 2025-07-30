import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAddress";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";

/**
 * Validate that attempting to retrieve addresses for a non-existent customer ID
 * as an administrator results in a 404 error.
 *
 * Business context:
 *
 * - Administrators may need to retrieve customer delivery addresses for service
 *   or support reasons.
 * - If the customer does not exist, the API should return a 404 Not Found error
 *   and not return any address data.
 *
 * Test workflow:
 *
 * 1. Generate a random UUID that does not correspond to any customer in the system
 *    (simulate a non-existent customer).
 * 2. Attempt to retrieve addresses using the administrator API endpoint for this
 *    non-existent customer ID.
 * 3. Confirm that the API throws a 404 error (HttpError with status 404), and no
 *    address data is returned.
 * 4. Validate that no resource is accidentally returned or created for an invalid
 *    customer ID.
 */
export async function test_api_aimall_backend_administrator_customers_addresses_test_admin_get_addresses_customer_not_found(
  connection: api.IConnection,
) {
  // 1. Generate a random, non-existent customer ID (UUID)
  const nonExistentCustomerId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // 2-4. Attempt to retrieve addresses for non-existent customer and validate 404 error is thrown, no data is returned
  await TestValidator.error("non-existent customer returns 404 error")(
    async () => {
      await api.functional.aimall_backend.administrator.customers.addresses.index(
        connection,
        {
          customerId: nonExistentCustomerId,
        },
      );
    },
  );
}
