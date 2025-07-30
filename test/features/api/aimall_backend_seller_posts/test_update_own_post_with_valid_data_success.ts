import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Validate post update logic for seller-owned community posts.
 *
 * This test ensures that a seller can update their own community post with
 * valid new content, and that the system returns the fully updated entity. It
 * verifies:
 *
 * 1. Only the original post owner with seller credentials can perform the update.
 * 2. The update propagates changes to title, body, and is_private as permitted,
 *    returning the revised post object.
 * 3. Audit timestamps (updated_at) are advanced, the post id is preserved, and key
 *    system fields like customer_id are unchanged.
 *
 * Test Workflow:
 *
 * 1. Create a seller community post (precondition/setup).
 * 2. As the post owner, update the title, body, and privacy field with valid
 *    values.
 * 3. Assert the update response reflects every mutation.
 * 4. Confirm updated_at differs from the prior entity, id is unchanged, privacy
 *    flag matches input, and deleted_at remains null.
 */
export async function test_api_aimall_backend_seller_posts_test_update_own_post_with_valid_data_success(
  connection: api.IConnection,
) {
  // Step 1: Seller creates community post
  const originalBody = {
    title: "Original post title",
    body: "Original post content.",
    is_private: false,
  } satisfies IAimallBackendPost.ICreate;
  const created = await api.functional.aimall_backend.seller.posts.create(
    connection,
    { body: originalBody },
  );
  typia.assert(created);

  // Step 2: Seller updates the post with new content
  const updatedBody = {
    title: "Updated post title",
    body: "Revised post content, now longer and more descriptive.",
    is_private: false,
  } satisfies IAimallBackendPost.IUpdate;
  const updated = await api.functional.aimall_backend.seller.posts.update(
    connection,
    { postId: created.id, body: updatedBody },
  );
  typia.assert(updated);

  // Step 3: Assertions on mutation and invariance
  TestValidator.equals("id unchanged")(updated.id)(created.id);
  TestValidator.equals("title updated")(updated.title)(updatedBody.title);
  TestValidator.equals("body updated")(updated.body)(updatedBody.body);
  TestValidator.notEquals("updated_at changed")(updated.updated_at)(
    created.updated_at,
  );
  TestValidator.equals("privacy flag updated")(updated.is_private)(
    updatedBody.is_private,
  );
  TestValidator.equals("customer_id constant")(updated.customer_id)(
    created.customer_id,
  );
  TestValidator.equals("no deletion")(updated.deleted_at)(null);
}
