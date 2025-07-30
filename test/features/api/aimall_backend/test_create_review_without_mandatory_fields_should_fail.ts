import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendReview";

/**
 * Test that the API correctly rejects creation of reviews when required fields
 * are omitted.
 *
 * This test checks the validation layer for POST
 * /aimall-backend/customer/reviews: title, body, and rating are all mandatory.
 * The API should respond with a validation error when any or all of these
 * fields are missing on creation request.
 *
 * Steps:
 *
 * 1. Attempt to create a review omitting 'title' (missing field).
 * 2. Attempt to create a review omitting 'body' (missing field).
 * 3. Attempt to create a review omitting 'rating' (missing field).
 * 4. Attempt to create a review omitting both 'title' and 'body'.
 * 5. Attempt to create a review omitting all three fields.
 * 6. For each attempt, validate that an error is thrown and creation is blocked.
 */
export async function test_api_aimall_backend_test_create_review_without_mandatory_fields_should_fail(
  connection: api.IConnection,
) {
  // 1. Attempt to create with missing 'title'
  await TestValidator.error("missing title should trigger validation error")(
    () =>
      api.functional.aimall_backend.customer.reviews.create(connection, {
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
          // title missing
          body: "Some review feedback.",
          rating: 5,
        } as any,
      }),
  );

  // 2. Attempt to create with missing 'body'
  await TestValidator.error("missing body should trigger validation error")(
    () =>
      api.functional.aimall_backend.customer.reviews.create(connection, {
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Great!",
          // body missing
          rating: 5,
        } as any,
      }),
  );

  // 3. Attempt to create with missing 'rating'
  await TestValidator.error("missing rating should trigger validation error")(
    () =>
      api.functional.aimall_backend.customer.reviews.create(connection, {
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Great!",
          body: "Some review feedback.",
          // rating missing
        } as any,
      }),
  );

  // 4. Attempt to create with missing 'title' and 'body'
  await TestValidator.error("missing title and body")(() =>
    api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        // title missing
        // body missing
        rating: 4,
      } as any,
    }),
  );

  // 5. Attempt to create with all fields missing except product_id
  await TestValidator.error("missing title, body, and rating")(() =>
    api.functional.aimall_backend.customer.reviews.create(connection, {
      body: {
        product_id: typia.random<string & tags.Format<"uuid">>(),
        // title missing
        // body missing
        // rating missing
      } as any,
    }),
  );
}
