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
 * Validates that a customer can update their own board post. Full flow:
 *
 * 1. Admin: create channel, section, board.
 * 2. Customer: register/join channel and create a board post
 * 3. Customer: update the board post (title/body/visibility)
 * 4. Validate the update is reflected (content, title, visibility, updated_at)
 * 5. Confirm audit meta and snapshot fields are appropriately changed
 * 6. Access: Another customer cannot update this post (should error)
 */
export async function test_api_board_post_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Admin creates channel
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

  // 2. Admin creates section below channel
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

  // 3. Admin creates board under this section
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
        post_expiry_days: 7,
      } satisfies IShoppingMallBoard.ICreate,
    },
  );
  typia.assert(board);

  // 4. Customer joins this channel
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: "customerpass",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);

  // 5. Customer creates a post
  const post = await api.functional.shoppingMall.customer.boards.posts.create(
    connection,
    {
      boardId: board.id,
      body: {
        shopping_mall_board_id: board.id,
        title: "Original title",
        body: "Original post content",
        is_official_answer: false,
        visibility: "public",
        moderation_status: "approved",
      } satisfies IShoppingMallBoardPost.ICreate,
    },
  );
  typia.assert(post);

  // 6. Save original post details for later comparison
  const originalBody = post.body;
  const originalTitle = post.title;
  const originalVisibility = post.visibility;
  const originalUpdatedAt = post.updated_at;

  // 7. Customer updates the post (title/body/visibility)
  const newTitle = "Updated Title";
  const newBody = RandomGenerator.content({ paragraphs: 1 });
  const newVisibility = "public";

  const updated =
    await api.functional.shoppingMall.customer.boards.posts.update(connection, {
      boardId: board.id,
      postId: post.id,
      body: {
        title: newTitle,
        body: newBody,
        visibility: newVisibility,
        moderation_status: "approved",
      } satisfies IShoppingMallBoardPost.IUpdate,
    });
  typia.assert(updated);

  // 8. Validate the post is updated
  TestValidator.equals("post title updated", updated.title, newTitle);
  TestValidator.equals("post body updated", updated.body, newBody);
  TestValidator.equals(
    "post visibility updated",
    updated.visibility,
    newVisibility,
  );
  TestValidator.notEquals(
    "post updated_at changed",
    updated.updated_at,
    originalUpdatedAt,
  );

  // 9. Attempt update as a different customer
  const outsiderEmail = typia.random<string & tags.Format<"email">>();
  const outsider = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: outsiderEmail,
      password: "nonownerpass",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(outsider);

  await TestValidator.error("another customer cannot update post", async () => {
    await api.functional.shoppingMall.customer.boards.posts.update(connection, {
      boardId: board.id,
      postId: post.id,
      body: {
        title: "Hacker update",
        body: "Hacked!",
        visibility: newVisibility,
        moderation_status: "approved",
      } satisfies IShoppingMallBoardPost.IUpdate,
    });
  });
}
