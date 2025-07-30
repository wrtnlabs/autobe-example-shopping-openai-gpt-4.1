import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate error handling of comment search with invalid filter criteria.
 *
 * This test ensures that the PATCH
 * /aimall-backend/customer/posts/{postId}/comments API rejects invalid or
 * malformed filter criteria for comment search requests. The goal is to confirm
 * that the API returns a validation error (rather than comment results or
 * unexpected success) when receiving wrong data types, non-existent fields, or
 * invalid pagination in the filter body.
 *
 * Steps:
 *
 * 1. Create a valid post using the /aimall-backend/customer/posts endpoint. This
 *    allows for a real postId to be used as context, though the filter criteria
 *    in the next step will be intentionally invalid.
 * 2. Attempt to perform a comment search on that post using PATCH, passing an
 *    invalid filter object (e.g., wrong data types for numeric fields,
 *    inclusion of undeclared fields, pagination with negative/zero/absurdly
 *    large values, or malformed date strings).
 * 3. Confirm the API responds with a validation error (error thrown or HTTP 4xx)
 *    and does NOT return a normal comment result or any unexpected success.
 * 4. For thoroughness, repeat with several types of invalid inputs (each broken
 *    individually and in combination) to confirm that validation is
 *    comprehensive and robust.
 */
export async function test_api_aimall_backend_customer_posts_comments_test_search_comments_with_invalid_criteria(
  connection: api.IConnection,
) {
  // Step 1: Create a valid post to receive a valid postId for context
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: "Test Invalid Comment Search Criteria",
        body: "Testing comment filter validation",
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 2: Attempt comment search with invalid filter criteria
  // Try wrong type: page as string
  await TestValidator.error("should throw error for wrong type in page")(() =>
    api.functional.aimall_backend.customer.posts.comments.search(connection, {
      postId: post.id,
      body: { page: "notANumber" as unknown as any } as any,
    }),
  );

  // Try negative limit
  await TestValidator.error("should throw error for negative limit")(() =>
    api.functional.aimall_backend.customer.posts.comments.search(connection, {
      postId: post.id,
      body: { limit: -99 as unknown as any } as any,
    }),
  );

  // Try extra, non-existent field
  await TestValidator.error("should throw error for non-existent filter field")(
    () =>
      api.functional.aimall_backend.customer.posts.comments.search(connection, {
        postId: post.id,
        body: { not_a_valid_field: "garbage" } as any,
      }),
  );

  // Try absurdly large pagination
  await TestValidator.error("should throw error for absurdly large pagination")(
    () =>
      api.functional.aimall_backend.customer.posts.comments.search(connection, {
        postId: post.id,
        body: { page: 1000000000, limit: 1000000000 } as any,
      }),
  );

  // Try malformed date format
  await TestValidator.error("should throw error for wrong date format")(() =>
    api.functional.aimall_backend.customer.posts.comments.search(connection, {
      postId: post.id,
      body: { created_at_from: "invalid-date-format" } as any,
    }),
  );

  // Try totally nonsense body
  await TestValidator.error(
    "should throw error for totally nonsense filter body",
  )(() =>
    api.functional.aimall_backend.customer.posts.comments.search(connection, {
      postId: post.id,
      body: { someRandomKey: 1234, another_weird: false } as any,
    }),
  );
}
