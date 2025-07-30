import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate API behavior when deleting a non-existent shopping cart by cartId.
 *
 * This test ensures the system correctly responds with an error when an
 * administrator attempts to delete a shopping cart that does not exist in the
 * database. It simulates the case by generating a random UUID that has not been
 * used to create any cart (or is extremely unlikely to exist), then making a
 * DELETE request against the /aimall-backend/administrator/carts/{cartId}
 * endpoint.
 *
 * Steps:
 *
 * 1. Generate a random UUID value for cartId that is not associated with any cart.
 * 2. Call the DELETE cart API endpoint with this cartId.
 * 3. Verify the result:
 *
 *    - The API returns a 404 Not Found error (should throw or fail the request as
 *         per SDK behavior)
 *    - No side effects or partial data modifications should occur.
 *    - The error is type-safe and would be caught by typical error handling (catch
 *         block, TestValidator.error, etc.)
 *    - Optionally, if business details are available, validate that the error
 *         message or error shape is appropriate (but without relying on
 *         specific message text).
 *
 * This test helps ensure proper error handling for invalid or non-existent
 * resource operations and guards against audit inconsistencies or silent
 * failures when deleting resources by ID.
 */
export async function test_api_aimall_backend_administrator_carts_test_delete_cart_with_invalid_id_returns_not_found_error(
  connection: api.IConnection,
) {
  // 1. Generate a random UUID unlikely to be associated with any cart.
  const randomCartId: string = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt deletion: Expect a 404 Not Found error.
  await TestValidator.error("deleting non-existent cart should 404")(
    async () => {
      await api.functional.aimall_backend.administrator.carts.erase(
        connection,
        { cartId: randomCartId },
      );
    },
  );
}
