import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Validate that an administrator can soft delete any community post, regardless
 * of ownership.
 *
 * This test ensures that an admin can perform a soft deletion (marking the post
 * as deleted without removing record from DB) for any post. The workflow
 * simulates a regular user creating a post, then an administrator deleting it.
 * The post must be hidden from standard API responses for general users, remain
 * in storage for audit, and (if possible via available APIs) we would check
 * that a soft deletion audit log is updated.
 *
 * Step-by-step process:
 *
 * 1. As a customer, create a community post using
 *    api.functional.aimall_backend.customer.posts.create.
 * 2. As an administrator, perform a soft delete using
 *    api.functional.aimall_backend.administrator.posts.erase.
 * 3. (If a read API was provided, attempt to access the deleted post as both admin
 *    and customer and confirm appropriate visibility behavior. However, since
 *    no such API is provided in available functions, skip to storage/audit
 *    check.)
 * 4. (If an audit log API is present, verify it was updated. No audit log API
 *    present so this will be omitted.)
 *
 * Edge Cases Not Tested (due to API limitations):
 *
 * - Checking visibility via API (list/query APIs missing)
 * - Checking the audit log, as there's no audit/audit-log API provided
 * - Trying to delete a post already deleted
 * - Testing insufficient permission (deleting as a regular customer) (Test only
 *   covers what can be implemented with provided APIs.)
 */
export async function test_api_aimall_backend_administrator_posts_test_admin_soft_delete_any_post_success(
  connection: api.IConnection,
) {
  // 1. As a customer, create a community post
  const customerPost =
    await api.functional.aimall_backend.customer.posts.create(connection, {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.paragraph()(2),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(customerPost);

  // 2. As an administrator, perform soft delete on the post
  await api.functional.aimall_backend.administrator.posts.erase(connection, {
    postId: customerPost.id,
  });

  // 3. (No API is provided to directly confirm the post is hidden or fetch audit logs. In a complete system,
  //    here we would verify post is not returned in customer queries and check audit log. As those
  //    APIs are missing, stop here.)
}
