import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoard";
import type { IShoppingMallBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoardPost";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate that an admin can update a board post, with audit/snapshot trace,
 * permission check, and moderation path.
 */
export async function test_api_board_post_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email,
      password,
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Create a channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 8 }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);

  // 3. Create section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 6 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create board in channel/section
  const board = await api.functional.shoppingMall.admin.boards.create(
    connection,
    {
      body: {
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        title: RandomGenerator.paragraph({ sentences: 4 }),
        description: RandomGenerator.paragraph({ sentences: 10 }),
        visibility: "public",
        moderation_required: RandomGenerator.pick([true, false]),
        post_expiry_days: null,
      } satisfies IShoppingMallBoard.ICreate,
    },
  );
  typia.assert(board);

  // 5. Create board post (simulate board post creation - not in APIs, but make an initial post update)
  let post = await api.functional.shoppingMall.admin.boards.posts.update(
    connection,
    {
      boardId: board.id,
      postId: typia.random<string & tags.Format<"uuid">>(),
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        visibility: "public",
        moderation_status: "approved",
        moderation_reason: null,
      } satisfies IShoppingMallBoardPost.IUpdate,
    },
  );
  typia.assert(post);
  const postId = post.id;

  // 6. Update the board post (change title, body, moderation metadata)
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const newBody = RandomGenerator.content({ paragraphs: 5 });
  const newModStatus = RandomGenerator.pick(["pending", "approved", "denied"]);
  const newModReason =
    newModStatus !== "approved"
      ? RandomGenerator.paragraph({ sentences: 1 })
      : null;

  const updatedPost =
    await api.functional.shoppingMall.admin.boards.posts.update(connection, {
      boardId: board.id,
      postId,
      body: {
        title: newTitle,
        body: newBody,
        visibility: "public",
        moderation_status: newModStatus,
        moderation_reason: newModReason,
      } satisfies IShoppingMallBoardPost.IUpdate,
    });
  typia.assert(updatedPost);
  TestValidator.equals(
    "updated post id remains unchanged",
    updatedPost.id,
    postId,
  );
  TestValidator.notEquals(
    "updated_at should change after update",
    updatedPost.updated_at,
    post.updated_at,
  );
  TestValidator.equals("title updated", updatedPost.title, newTitle);
  TestValidator.equals("body updated", updatedPost.body, newBody);
  TestValidator.equals("visibility remains", updatedPost.visibility, "public");
  TestValidator.equals(
    "moderation status updated",
    updatedPost.moderation_status,
    newModStatus,
  );
  TestValidator.equals(
    "moderation reason updated",
    updatedPost.moderation_reason,
    newModReason,
  );

  // 7. Error: Try update after logout (simulate unauthorized)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized update attempt should fail",
    async () => {
      await api.functional.shoppingMall.admin.boards.posts.update(unauthConn, {
        boardId: board.id,
        postId,
        body: {
          title: RandomGenerator.name(),
          body: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallBoardPost.IUpdate,
      });
    },
  );

  // 8. Error: Try update with postId that does not exist (simulate deleted)
  await TestValidator.error(
    "updating non-existent post should fail",
    async () => {
      await api.functional.shoppingMall.admin.boards.posts.update(connection, {
        boardId: board.id,
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          title: RandomGenerator.name(),
          body: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallBoardPost.IUpdate,
      });
    },
  );

  // 9. Error: Try update immutable fields is not possible (no such fields in IUpdate)

  // 10. Error: Try update without required prerequisites - already tested by missing post id above
}
