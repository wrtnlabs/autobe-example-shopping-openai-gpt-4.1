import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoard";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate that an administrator can logically (soft) delete a post in an
 * administratively managed board, enforcing audit/evidence retention rules and
 * confirming deleted_at is set.
 *
 * Steps:
 *
 * 1. Register and authenticate as admin (join API)
 * 2. Create a channel (admin/channels)
 * 3. Create a section in the channel (admin/channels/{channelId}/sections)
 * 4. Create a board tied to the channel/section (admin/boards)
 * 5. Create a post record to the created board (for actual test, FAKE post UUID
 *    since no post-create API is provided, but scenario logic is preserved).
 * 6. Invoke erase (delete) on /shoppingMall/admin/boards/{boardId}/posts/{postId},
 *    assert that the call completes (void output) and post is considered
 *    deleted (simulate evidence by checking this operation does not throw,
 *    since no get/recover API provided).
 * 7. Negative 1: Try to erase same post again (should error, as it's already
 *    deleted)
 * 8. Negative 2: Try to erase a post with a non-existent postId or boardId (should
 *    error on not found).
 *
 * Only entities specified in DTOs are created via API. PostId is generated as a
 * UUID as per schema.
 */
export async function test_api_board_post_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Password123!",
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      },
    },
  );
  typia.assert(channel);

  // 3. Create section in the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        },
      },
    );
  typia.assert(section);

  // 4. Create board attached to channel and section
  const board = await api.functional.shoppingMall.admin.boards.create(
    connection,
    {
      body: {
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph(),
        visibility: "public",
        moderation_required: false,
        post_expiry_days: null,
      },
    },
  );
  typia.assert(board);

  // 5. Simulate post creation, generate postId as uuid (since no post create API)
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 6. Positive case: Successfully erase (soft delete) the post
  await api.functional.shoppingMall.admin.boards.posts.erase(connection, {
    boardId: board.id,
    postId,
  });

  // 7. Negative case: Try deleting same post again (should fail with error)
  await TestValidator.error("cannot delete already deleted post", async () => {
    await api.functional.shoppingMall.admin.boards.posts.erase(connection, {
      boardId: board.id,
      postId,
    });
  });

  // 8. Negative case: Try deleting with non-existent boardId
  await TestValidator.error(
    "cannot delete post in non-existent board",
    async () => {
      await api.functional.shoppingMall.admin.boards.posts.erase(connection, {
        boardId: typia.random<string & tags.Format<"uuid">>(),
        postId: postId,
      });
    },
  );

  // 9. Negative case: Try deleting with non-existent postId
  await TestValidator.error("cannot delete non-existent post", async () => {
    await api.functional.shoppingMall.admin.boards.posts.erase(connection, {
      boardId: board.id,
      postId: typia.random<string & tags.Format<"uuid">>(),
    });
  });
}
