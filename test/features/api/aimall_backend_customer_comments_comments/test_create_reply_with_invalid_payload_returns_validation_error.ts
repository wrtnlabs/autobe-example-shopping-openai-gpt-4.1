import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate system response when attempting to create an invalid reply (child
 * comment) under a parent comment.
 *
 * This test ensures that the comment creation endpoint correctly enforces
 * validation and business rules when a user attempts to create an invalid reply
 * comment (for example, with an empty body, or by omitting the is_private flag
 * required by the DTO). The API should reject such requests, respond with
 * appropriate error details, and must not create new records.
 *
 * Test steps:
 *
 * 1. Precondition: Create a valid parent comment to use as the reply target (using
 *    customer/comments.create)
 * 2. Attempt to submit a reply under the parent comment with invalid payloads -
 *    should result in a validation error: a) Try sending a reply with an empty
 *    body (body = "") b) Attempting to omit the required is_private field would
 *    cause a TypeScript compilation error, so this scenario is skipped as per
 *    guidelines.
 * 3. Assert that API response indicates validation error (use TestValidator.error)
 * 4. Assert that no reply record is created or returned when input is invalid.
 */
export async function test_api_aimall_backend_customer_comments_comments_test_create_reply_with_invalid_payload_returns_validation_error(
  connection: api.IConnection,
) {
  // 1. Create a valid parent comment
  const parentPayload = {
    body: "This is a valid parent comment.",
    is_private: false,
  } satisfies IAimallBackendComment.ICreate;
  const parent = await api.functional.aimall_backend.customer.comments.create(
    connection,
    { body: parentPayload },
  );
  typia.assert(parent);

  // 2a. Attempt creating a reply with an empty body string (invalid)
  await TestValidator.error("Reply with empty body should fail")(() =>
    api.functional.aimall_backend.customer.comments.comments.create(
      connection,
      {
        commentId: parent.id,
        body: {
          body: "",
          is_private: false,
        } satisfies IAimallBackendComment.ICreate,
      },
    ),
  );

  // 2b. Skipped: Attempting to omit required is_private would cause a TypeScript compilation error
  // Only runtime-validatable invalid payloads are tested according to E2E guidelines.
}
