import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoard";
import type { IShoppingMallBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoardPost";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * End-to-end test: A customer retrieves the complete details of their own board
 * post after creation.
 *
 * This test validates the full integration flow for customer-originated posts
 * on a board:
 *
 * - Customer account creation/registration
 * - Admin creates the necessary channel, section, and board
 * - Customer creates the initial post
 * - Retrieval of that post with all expected detail fields
 * - Assert correct author linkage and business rule compliance
 *
 * Flow:
 *
 * 1. Register new customer (random email/name).
 * 2. Create channel (admin), then section under channel, and then board with
 *    public visibility/no-moderation.
 * 3. Customer creates a new board post; basic text fields only.
 * 4. Retrieve the post detail as the customer.
 * 5. Validate: title/body, author association is correct, moderation_status is
 *    'approved', reply_level=0, parent/product/order relationships are
 *    undefined, visibility/public, correct timestamps, IDs, nullables, etc.
 * 6. Ensure content and author identity is fully returned for the author, not
 *    masked.
 */
export async function test_api_board_post_detail_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Admin creates a new shopping mall channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IShoppingMallChannel.ICreate,
    },
  );
  typia.assert(channel);
  // 2. Admin creates a section under the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);
  // 3. Admin creates a board under the channel and section
  const board = await api.functional.shoppingMall.admin.boards.create(
    connection,
    {
      body: {
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        visibility: "public",
        moderation_required: false,
        post_expiry_days: null,
      } satisfies IShoppingMallBoard.ICreate,
    },
  );
  typia.assert(board);
  // 4. Register and authenticate new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerName = RandomGenerator.name();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      name: customerName,
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 5. Customer creates the board post (public, no modulus, root thread)
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 6,
    sentenceMax: 8,
  });
  const createdPost =
    await api.functional.shoppingMall.customer.boards.posts.create(connection, {
      boardId: board.id,
      body: {
        shopping_mall_board_id: board.id,
        title: postTitle,
        body: postBody,
        is_official_answer: false,
        visibility: "public",
        moderation_status: "approved",
      } satisfies IShoppingMallBoardPost.ICreate,
    });
  typia.assert(createdPost);
  // 6. Retrieve the post detail as the same customer
  const post = await api.functional.shoppingMall.boards.posts.at(connection, {
    boardId: board.id,
    postId: createdPost.id,
  });
  typia.assert(post);
  // 7. Assertions/test logic: verify all relevant fields per contract
  TestValidator.equals("post title matches input", post.title, postTitle);
  TestValidator.equals("post body matches input", post.body, postBody);
  TestValidator.equals(
    "associated customer is the author",
    post.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "no seller association",
    post.shopping_mall_seller_id,
    undefined,
  );
  TestValidator.equals(
    "no admin association",
    post.shopping_mall_admin_id,
    undefined,
  );
  TestValidator.equals(
    "parent post id is undefined (root)",
    post.shopping_mall_parent_post_id,
    undefined,
  );
  TestValidator.equals(
    "product id is undefined",
    post.shopping_mall_product_id,
    undefined,
  );
  TestValidator.equals(
    "order id is undefined",
    post.shopping_mall_order_id,
    undefined,
  );
  TestValidator.equals(
    "moderation reason is undefined",
    post.moderation_reason,
    undefined,
  );
  TestValidator.equals(
    "moderation status is 'approved'",
    post.moderation_status,
    "approved",
  );
  TestValidator.equals("reply level is 0 (root post)", post.reply_level, 0);
  TestValidator.equals(
    "is not an official answer",
    post.is_official_answer,
    false,
  );
  TestValidator.equals("visibility is public", post.visibility, "public");
  TestValidator.notEquals(
    "created_at timestamp present",
    post.created_at,
    undefined,
  );
  TestValidator.notEquals(
    "updated_at timestamp present",
    post.updated_at,
    undefined,
  );
  TestValidator.equals("deleted_at is undefined", post.deleted_at, undefined);
  TestValidator.equals(
    "board id matches",
    post.shopping_mall_board_id,
    board.id,
  );
  TestValidator.equals("post id matches", post.id, createdPost.id);
  // (Business logic: For public approved post, author fields and content are returned and not masked)
}
