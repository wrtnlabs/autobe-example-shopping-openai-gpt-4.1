import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAttachment";
import type { IPageIAimallBackendAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate the API's type/schema validation on comment attachment search (as
 * customer).
 *
 * This test ensures the PATCH
 * /aimall-backend/customer/comments/{commentId}/attachments endpoint enforces
 * strict validation by rejecting malformed filter criteria (wrong data type in
 * request body). It ensures that only correctly-typed fields in the filter are
 * accepted and triggers validation errors for bad payloads.
 *
 * Steps:
 *
 * 1. Create a comment as a customer to obtain a valid commentId for subsequent
 *    search
 * 2. Perform a PATCH search for attachments with a filter body containing
 *    deliberately invalid types (e.g., number for file_type, string for
 *    file_size_min)
 *
 *    - Expect the API to respond with validation error (e.g., HTTP 422)
 * 3. Sanity check: Issue a valid filter search (correct types/empty filter) to
 *    confirm normal operation succeeds
 */
export async function test_api_aimall_backend_customer_comments_attachments_test_search_attachments_with_invalid_filter_criteria_as_customer(
  connection: api.IConnection,
) {
  // 1. Create a prerequisite comment (for attachment context)
  const comment = await api.functional.aimall_backend.customer.comments.create(
    connection,
    {
      body: {
        body: "Attachment validation test comment.",
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    },
  );
  typia.assert(comment);

  // 2. Attempt PATCH search with malformed filter fields (should fail validation)
  await TestValidator.error(
    "invalid filter fields: number for file_type, string for file_size_min",
  )(async () => {
    await api.functional.aimall_backend.customer.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: {
          file_type: 9876 as any, // should be string, force wrong type
          file_size_min: "not-a-number" as any, // should be number/int32, supply string
        } as any,
      },
    );
  });

  // 3. Sanity: valid PATCH search with proper filter works
  const result =
    await api.functional.aimall_backend.customer.comments.attachments.search(
      connection,
      {
        commentId: comment.id,
        body: {}, // no filter (valid, correct empty criteria)
      },
    );
  typia.assert(result);
}
