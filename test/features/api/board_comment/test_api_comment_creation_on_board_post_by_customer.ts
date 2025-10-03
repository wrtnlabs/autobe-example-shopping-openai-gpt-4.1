import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoard";
import type { IShoppingMallBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoardPost";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComment";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test successful creation of a comment (including threaded replies) on a board
 * post by a customer.
 *
 * 1. Register admin
 * 2. Register customer
 * 3. Admin creates a channel
 * 4. Admin creates a section in the channel
 * 5. Admin creates a board in the channel/section
 * 6. Customer creates a post in the board
 * 7. Customer comments on the post (root comment)
 * 8. Customer replies to the comment (threaded child)
 * 9. Negative: Unauthenticated comment creation
 * 10. Negative: Comment on non-existent post
 * 11. Validate authorship, threading, moderation fields
 */
export async function test_api_comment_creation_on_board_post_by_customer(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123*",
      name: RandomGenerator.name(2),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);

  // 2. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: "CustPass#9$",
      name: RandomGenerator.name(2),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 3. Admin creates section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Admin creates board
  const board = await api.functional.shoppingMall.admin.boards.create(
    connection,
    {
      body: {
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        visibility: "public",
        moderation_required: true,
        post_expiry_days: null,
      } satisfies IShoppingMallBoard.ICreate,
    },
  );
  typia.assert(board);

  // 5. Customer creates a board post
  await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: "CustPass#9$",
      name: RandomGenerator.name(2),
    } satisfies IShoppingMallCustomer.IJoin,
  }); // reconnect customer (if token needs to be refreshed)
  const post = await api.functional.shoppingMall.customer.boards.posts.create(
    connection,
    {
      boardId: board.id,
      body: {
        shopping_mall_board_id: board.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        is_official_answer: false,
        visibility: "public",
        moderation_status: "pending",
      } satisfies IShoppingMallBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Customer creates root comment
  const rootCommentBody = RandomGenerator.paragraph({ sentences: 3 });
  const rootComment =
    await api.functional.shoppingMall.customer.boards.posts.comments.create(
      connection,
      {
        boardId: board.id,
        postId: post.id,
        body: {
          body: rootCommentBody,
          shopping_mall_board_post_id: post.id,
        } satisfies IShoppingMallComment.ICreate,
      },
    );
  typia.assert(rootComment);
  TestValidator.predicate(
    "root comment has correct reference",
    rootComment.shopping_mall_board_post_id === post.id,
  );
  TestValidator.equals(
    "root comment authorship matches customer",
    rootComment.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals("level is 0 (root)", rootComment.level, 0);
  TestValidator.equals(
    "moderation_status set",
    typeof rootComment.moderation_status,
    "string",
  );
  TestValidator.predicate(
    "rootComment created timestamp exists",
    typeof rootComment.created_at === "string" &&
      rootComment.created_at.length > 0,
  );

  // 7. Customer replies to the root comment (threaded child)
  const replyBody = RandomGenerator.paragraph({ sentences: 2 });
  const replyComment =
    await api.functional.shoppingMall.customer.boards.posts.comments.create(
      connection,
      {
        boardId: board.id,
        postId: post.id,
        body: {
          body: replyBody,
          shopping_mall_board_post_id: post.id,
          shopping_mall_parent_comment_id: rootComment.id,
        } satisfies IShoppingMallComment.ICreate,
      },
    );
  typia.assert(replyComment);
  TestValidator.equals(
    "reply has parent pointer",
    replyComment.shopping_mall_parent_comment_id,
    rootComment.id,
  );
  TestValidator.equals("reply has level 1", replyComment.level, 1);
  TestValidator.equals(
    "reply authorship",
    replyComment.shopping_mall_customer_id,
    customer.id,
  );

  // 8. Negative: Comment creation by unauthenticated user
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthenticated cannot comment", async () => {
    await api.functional.shoppingMall.customer.boards.posts.comments.create(
      unauthConn,
      {
        boardId: board.id,
        postId: post.id,
        body: {
          body: "Should fail: unauthenticated",
          shopping_mall_board_post_id: post.id,
        } satisfies IShoppingMallComment.ICreate,
      },
    );
  });

  // 9. Negative: Comment on a non-existent post (invalid UUID)
  const bogusPostId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("cannot comment on invalid post", async () => {
    await api.functional.shoppingMall.customer.boards.posts.comments.create(
      connection,
      {
        boardId: board.id,
        postId: bogusPostId,
        body: {
          body: "Should fail: post not found",
          shopping_mall_board_post_id: bogusPostId,
        } satisfies IShoppingMallComment.ICreate,
      },
    );
  });
  // Both comments exist with correct references
  TestValidator.equals(
    "root comment post id",
    rootComment.shopping_mall_board_post_id,
    post.id,
  );
  TestValidator.equals(
    "reply comment parent id",
    replyComment.shopping_mall_parent_comment_id,
    rootComment.id,
  );
  TestValidator.notEquals(
    "reply comment is not root",
    replyComment.id,
    rootComment.id,
  );
}
