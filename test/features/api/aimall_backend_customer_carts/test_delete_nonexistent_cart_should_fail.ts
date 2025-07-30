import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";

/**
 * Validate failure when trying to delete a non-existent or invalid shopping
 * cart.
 *
 * This test ensures that the system does not perform any deletion and returns
 * an appropriate error (such as not found or validation error) when a user
 * attempts to delete a cart by passing a cartId that does not exist or is
 * invalid (i.e., not a valid UUID).
 *
 * Step-by-step process:
 *
 * 1. Attempt to delete a cart with a syntactically valid UUID that does not exist
 *    in the system; verify that an error is thrown and no deletion is
 *    performed.
 * 2. Attempt to delete a cart with an invalid UUID format (e.g., random string),
 *    verify that validation error is thrown and no deletion is performed.
 */
export async function test_api_aimall_backend_customer_carts_test_delete_nonexistent_cart_should_fail(
  connection: api.IConnection,
) {
  // 1. Attempt to delete a non-existent cartId (valid UUID, but not present in the system)
  await TestValidator.error(
    "delete with non-existent cartId should return not found error",
  )(async () => {
    await api.functional.aimall_backend.customer.carts.erase(connection, {
      cartId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 2. Attempt to delete with an invalid cartId format (not a UUID string)
  await TestValidator.error(
    "delete with invalid UUID should return validation error",
  )(async () => {
    await api.functional.aimall_backend.customer.carts.erase(connection, {
      cartId: "invalid-uuid-string",
    });
  });
}
