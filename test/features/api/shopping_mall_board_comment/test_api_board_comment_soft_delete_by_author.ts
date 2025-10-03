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
 * Test the soft deletion logic for a comment by its own author (customer) on a
 * board post, covering business logic, access control, and audit compliance.
 * Steps:
 *
 * 1. Register admin.
 * 2. Admin creates mall channel.
 * 3. Admin creates section in channel.
 * 4. Admin creates board with that section/channel.
 * 5. Register customer into that channel.
 * 6. Customer creates post in that board.
 * 7. Customer creates comment on that post.
 * 8. Customer performs soft DELETE on that comment.
 * 9. Attempt unauthorized deletion (by another customer, not permitted).
 * 10. Attempt deletion of already deleted comment (should reject).
 */
export async function test_api_board_comment_soft_delete_by_author(
  connection: api.IConnection,
) {
  // Admin registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
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
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
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
        title: RandomGenerator.paragraph({ sentences: 5 }),
        description: RandomGenerator.paragraph(),
        visibility: "public",
        moderation_required: false,
        post_expiry_days: null,
      } satisfies IShoppingMallBoard.ICreate,
    },
  );
  typia.assert(board);

  // Register customer (author)
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(10);
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channel.id,
        email: customerEmail,
        password: customerPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // Customer creates post
  const post = await api.functional.shoppingMall.customer.boards.posts.create(
    connection,
    {
      boardId: board.id,
      body: {
        shopping_mall_board_id: board.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 1 }),
        is_official_answer: false,
        visibility: "public",
        moderation_status: "approved",
      } satisfies IShoppingMallBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // Customer creates comment
  const comment =
    await api.functional.shoppingMall.customer.boards.posts.comments.create(
      connection,
      {
        boardId: board.id,
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 2 }),
          shopping_mall_board_post_id: post.id,
        } satisfies IShoppingMallComment.ICreate,
      },
    );
  typia.assert(comment);

  // Customer (author) soft deletes their comment
  await api.functional.shoppingMall.customer.boards.posts.comments.erase(
    connection,
    {
      boardId: board.id,
      postId: post.id,
      commentId: comment.id,
    },
  );

  // Try unauthorized deletion (different customer)
  const anotherEmail: string = typia.random<string & tags.Format<"email">>();
  const anotherPassword = RandomGenerator.alphaNumeric(10);
  const anotherCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channel.id,
        email: anotherEmail,
        password: anotherPassword,
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(anotherCustomer);

  await TestValidator.error(
    "non-author customer cannot delete other's comment",
    async () => {
      await api.functional.shoppingMall.customer.boards.posts.comments.erase(
        connection,
        {
          boardId: board.id,
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );

  // Try deleting an already deleted comment (should error)
  await TestValidator.error(
    "cannot delete comment that's already deleted",
    async () => {
      await api.functional.shoppingMall.customer.boards.posts.comments.erase(
        connection,
        {
          boardId: board.id,
          postId: post.id,
          commentId: comment.id,
        },
      );
    },
  );
}
