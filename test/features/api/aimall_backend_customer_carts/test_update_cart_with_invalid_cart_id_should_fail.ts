import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Update cart with invalid or non-existent cartId should fail
 *
 * Validates that attempts to update a shopping cart with either a malformed
 * cartId (not a UUID) or with a syntactically valid but non-existent cartId,
 * properly trigger validation or resource not found errors. Ensures no actual
 * cart data is changed as a result of these calls.
 *
 * Steps:
 *
 * 1. Try updating a cart with a malformed cartId (not a UUID) and expect
 *    validation error.
 * 2. Try updating a cart with a well-formed but non-existent cartId (random UUID),
 *    expect not found error.
 */
export async function test_api_aimall_backend_customer_carts_test_update_cart_with_invalid_cart_id_should_fail(
  connection: api.IConnection,
) {
  // 1. Malformed cartId (not a UUID format)
  await TestValidator.error("malformed cartId should cause validation error")(
    () =>
      api.functional.aimall_backend.customer.carts.update(connection, {
        cartId: "not-a-uuid",
        body: {
          updated_at: new Date().toISOString(),
        } satisfies IAimallBackendCart.IUpdate,
      }),
  );

  // 2. Well-formed but non-existent cartId (random UUID)
  await TestValidator.error("non-existent cartId should cause not found error")(
    () =>
      api.functional.aimall_backend.customer.carts.update(connection, {
        cartId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          updated_at: new Date().toISOString(),
        } satisfies IAimallBackendCart.IUpdate,
      }),
  );
}
