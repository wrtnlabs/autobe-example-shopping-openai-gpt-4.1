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
 * Validate customer board post creation. Steps:
 *
 * 1. Admin creates a channel and section.
 * 2. Admin creates a board (with defined moderation/visibility settings)
 *    referencing the created channel/section.
 * 3. Register a new customer for the channel.
 * 4. As the customer, create a board post for the board.
 * 5. Assert post fields are correct (relations, content, moderation, author).
 */
export async function test_api_board_post_creation_by_customer(
  connection: api.IConnection,
) {
  // 1. Admin creates channel
  const channelBody = {
    code: RandomGenerator.alphabets(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelBody,
    });
  typia.assert(channel);

  // 2. Admin creates section within that channel
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphabets(6),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: 1,
  } satisfies IShoppingMallSection.ICreate;
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionBody,
      },
    );
  typia.assert(section);

  // 3. Admin creates board referencing channel and section
  const boardBody = {
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    moderation_required: true,
    post_expiry_days: null,
  } satisfies IShoppingMallBoard.ICreate;
  const board: IShoppingMallBoard =
    await api.functional.shoppingMall.admin.boards.create(connection, {
      body: boardBody,
    });
  typia.assert(board);

  // 4. Customer registration (for this channel)
  const customerEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const customerJoinBody = {
    shopping_mall_channel_id: channel.id,
    email: customerEmail,
    password: "Abc12345!",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 5. As customer, create a board post
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postBodyContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 8,
  });
  const postCreateBody = {
    shopping_mall_board_id: board.id,
    title: postTitle,
    body: postBodyContent,
    is_official_answer: false,
    visibility: "public",
    moderation_status: "pending",
  } satisfies IShoppingMallBoardPost.ICreate;
  const post: IShoppingMallBoardPost =
    await api.functional.shoppingMall.customer.boards.posts.create(connection, {
      boardId: board.id,
      body: postCreateBody,
    });
  typia.assert(post);

  // Assertions: Ensure post has correct relationships/fields
  TestValidator.equals(
    "board id linked",
    post.shopping_mall_board_id,
    board.id,
  );
  TestValidator.equals(
    "customer author id linked",
    post.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "not marked as official answer",
    post.is_official_answer,
    false,
  );
  TestValidator.equals("public visibility", post.visibility, "public");
  TestValidator.equals(
    "moderation set to 'pending'",
    post.moderation_status,
    "pending",
  );
  TestValidator.equals("post title matches", post.title, postTitle);
  TestValidator.equals("post content matches", post.body, postBodyContent);
}
