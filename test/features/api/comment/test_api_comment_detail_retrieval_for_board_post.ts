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
 * Test detailed retrieval of a board post comment for existence and proper
 * field population (as customer).
 *
 * This test performs:
 *
 * 1. Admin registration.
 * 2. Shopping mall channel/section/board creation by admin.
 * 3. Customer registration.
 * 4. Board post creation by customer.
 * 5. Comment creation by customer.
 * 6. Fetches the just-created comment and verifies the body field matches input.
 * 7. Asserts non-existent comment fetch throws error. The test does not attempt
 *    moderation, visibility, masking, deleted state, or role switching as the
 *    API/DTO do not expose such features for comments.
 */
export async function test_api_comment_detail_retrieval_for_board_post(
  connection: api.IConnection,
) {
  // Register admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: RandomGenerator.name(1) + "@admin.com",
      password: "admin-password",
      name: RandomGenerator.name(2),
    },
  });
  typia.assert(admin);

  // Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph(),
      },
    },
  );
  typia.assert(channel);

  // Create section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        },
      },
    );
  typia.assert(section);

  // Create board
  const board = await api.functional.shoppingMall.admin.boards.create(
    connection,
    {
      body: {
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph(),
        visibility: "public",
        moderation_required: false,
        post_expiry_days: null,
      },
    },
  );
  typia.assert(board);

  // Register customer
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: RandomGenerator.name(1) + "@user.com",
      name: RandomGenerator.name(2),
      password: "user-password",
      phone: undefined,
    },
  });
  typia.assert(customer);

  // Customer creates board post
  const post = await api.functional.shoppingMall.customer.boards.posts.create(
    connection,
    {
      boardId: board.id,
      body: {
        shopping_mall_board_id: board.id,
        title: RandomGenerator.name(3),
        body: RandomGenerator.paragraph({ sentences: 12 }),
        is_official_answer: false,
        visibility: "public",
        moderation_status: "approved",
      },
    },
  );
  typia.assert(post);

  // Customer creates a comment
  const commentText = RandomGenerator.paragraph({ sentences: 3 });
  const comment =
    await api.functional.shoppingMall.customer.boards.posts.comments.create(
      connection,
      {
        boardId: board.id,
        postId: post.id,
        body: {
          body: commentText,
          shopping_mall_board_post_id: post.id,
        },
      },
    );
  typia.assert(comment);

  // Fetch the comment detail by its id
  const fetched = await api.functional.shoppingMall.boards.posts.comments.at(
    connection,
    {
      boardId: board.id,
      postId: post.id,
      commentId: comment.id,
    },
  );
  typia.assert(fetched);
  TestValidator.equals("comment body matches input", fetched.body, commentText);

  // Fetching a non-existent comment should error
  await TestValidator.error(
    "fetching non-existent comment throws error",
    async () => {
      await api.functional.shoppingMall.boards.posts.comments.at(connection, {
        boardId: board.id,
        postId: post.id,
        commentId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
