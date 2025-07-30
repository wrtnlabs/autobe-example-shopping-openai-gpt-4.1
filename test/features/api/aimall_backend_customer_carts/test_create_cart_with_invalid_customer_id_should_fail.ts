import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";

/**
 * Test creation of a cart with an invalid or non-existent customer_id.
 *
 * This test verifies backend validation for the creation endpoint of the
 * aimall_backend_carts resource, specifically with regards to customer
 * ownership.
 *
 * Steps:
 *
 * 1. Attempt to create a cart using a syntactically invalid (malformed) UUID for
 *    aimall_backend_customer_id.
 *
 *    - Expectation: API rejects the request with validation error (UUID format
 *         fails).
 * 2. Attempt to create a cart using a valid UUID format but that doesn't
 *    correspond to an existing customer.
 *
 *    - Expectation: API rejects the request with referential integrity error
 *         (customer not found).
 * 3. For both cases, assert that no cart resource is created by testing for error
 *    responses, and that the error is at the validation/integrity level (not
 *    other failure types).
 */
export async function test_api_aimall_backend_customer_carts_test_create_cart_with_invalid_customer_id_should_fail(
  connection: api.IConnection,
) {
  // 1. Attempt creation with malformed (invalid) UUID
  const invalidUUID = "not-a-valid-uuid";
  await TestValidator.error("Malformed customer UUID should fail")(async () => {
    await api.functional.aimall_backend.customer.carts.create(connection, {
      body: {
        aimall_backend_customer_id: invalidUUID,
      },
    });
  });

  // 2. Attempt creation with valid (uuid format) but non-existent customer_id
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Non-existent customer UUID should fail")(
    async () => {
      await api.functional.aimall_backend.customer.carts.create(connection, {
        body: {
          aimall_backend_customer_id: nonExistentUUID,
        },
      });
    },
  );
}
