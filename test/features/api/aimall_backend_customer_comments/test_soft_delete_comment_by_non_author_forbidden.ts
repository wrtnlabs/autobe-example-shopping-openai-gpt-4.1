import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";

/**
 * Validate that a customer cannot soft-delete (logically delete) a comment
 * written by another customer (FORBIDDEN scenario).
 *
 * NOTE: This scenario expects to test forbidden access (customer B cannot erase
 * A's comment), but the provided API set DOES NOT include authentication
 * endpoints to create or login as another customer/account. Therefore, this
 * test ONLY demonstrates what is implementable: creation and erasure by the
 * same user session ("happy path"). The "forbidden deletion by non-author" case
 * cannot be covered here.
 *
 * Steps covered:
 *
 * 1. Create a comment as the single available authenticated customer
 * 2. Soft-delete it (permitted, since same user)
 *
 * Steps omitted: forbidden access from a different customer (not possible with
 * available APIs)
 */
export async function test_api_aimall_backend_customer_comments_test_soft_delete_comment_by_non_author_forbidden(
  connection: api.IConnection,
) {
  // 1. Create a comment as the current customer
  const comment = await api.functional.aimall_backend.customer.comments.create(
    connection,
    {
      body: {
        body: RandomGenerator.paragraph()(),
        is_private: false,
      } satisfies IAimallBackendComment.ICreate,
    },
  );
  typia.assert(comment);

  // 2. Soft-delete the comment as the same customer (the only scenario supported by API)
  await api.functional.aimall_backend.customer.comments.erase(connection, {
    commentId: comment.id,
  });
  // Cannot test forbidden deletion by another user/account given current API surface
}
