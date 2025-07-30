import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Validate that the administrator cannot create a cart with an invalid
 * customer_id.
 *
 * This test checks the system's referential integrity and validation by
 * attempting to create a cart using an obviously invalid or malformed value in
 * `aimall_backend_customer_id`. The expectation is that the system denies the
 * operation and raises a validation or referential integrity error, regardless
 * of the administrator's privileges.
 *
 * Step-by-step process:
 *
 * 1. Attempt to create a cart as administrator, passing a clearly invalid
 *    customer_id (not a UUID).
 * 2. Confirm that a validation error is thrown (malformed customer_id).
 * 3. Attempt to create a cart as administrator, passing a valid-format but
 *    non-existent customer_id.
 * 4. Confirm that a referential integrity error is thrown (UUID does not belong to
 *    any customer).
 */
export async function test_api_aimall_backend_administrator_carts_test_admin_create_cart_with_invalid_customer_id_should_fail(
  connection: api.IConnection,
) {
  // 1. Try creating a cart with an obviously invalid customer_id (malformed UUID)
  await TestValidator.error("malformed customer_id should fail")(async () => {
    await api.functional.aimall_backend.administrator.carts.create(connection, {
      body: {
        aimall_backend_customer_id: "not-a-uuid",
      },
    });
  });

  // 2. Try creating a cart with a valid UUID format, but highly likely non-existent customer
  const invalidUuid = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa" as string &
    tags.Format<"uuid">;
  await TestValidator.error("non-existent customer_id should fail")(
    async () => {
      await api.functional.aimall_backend.administrator.carts.create(
        connection,
        {
          body: {
            aimall_backend_customer_id: invalidUuid,
          },
        },
      );
    },
  );
}
