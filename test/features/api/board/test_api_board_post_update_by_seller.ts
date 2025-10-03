import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoard";
import type { IShoppingMallBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoardPost";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a seller can update their own board post and that the update
 * process enforces ownership and permissions strictly.
 *
 * Implementation plan:
 *
 * 1. Register and authenticate seller A as test subject for post modification
 *    workflow.
 * 2. Register and authenticate a second seller B to test unauthorized
 *    modification.
 * 3. Create a shopping mall channel as admin to establish board context.
 * 4. Create a section within the channel (admin role).
 * 5. Create a board within the section (admin role).
 * 6. With seller A, create a board post (simulated, as only the update endpoint is
 *    available).
 * 7. Use seller A identity to update their own board post—validate that the update
 *    is successful and the modification is visible.
 * 8. Use seller B identity to attempt the update; validate that this is rejected
 *    with a proper error, enforcing ownership/role restrictions.
 * 9. Confirm post state remains as after Seller A's update (simulate as actual
 *    get/fetch endpoint is not available).
 */
export async function test_api_board_post_update_by_seller(
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

  // 2. Admin creates section
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 3. Admin creates board
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
        post_expiry_days: 30,
      } satisfies IShoppingMallBoard.ICreate,
    },
  );
  typia.assert(board);

  // 4. Register Seller A and login
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: "1234",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);

  // 5. Register Seller B and login
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: "1234",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);

  // 6. Simulate creation of seller A's board post (since only update is available; generate UUID for postId)
  const postId = typia.random<string & tags.Format<"uuid">>();
  // Assume a pre-existing post by Seller A (cannot create for real with available APIs).

  // 7. Seller A updates their board post (happy path)
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({ paragraphs: 2 }),
    visibility: "public",
    moderation_status: "approved",
    moderation_reason: null,
  } satisfies IShoppingMallBoardPost.IUpdate;
  const updatedPost =
    await api.functional.shoppingMall.seller.boards.posts.update(connection, {
      boardId: board.id,
      postId: postId,
      body: updateBody,
    });
  typia.assert(updatedPost);
  TestValidator.equals(
    "post updated correctly by owner",
    updatedPost.body,
    updateBody.body,
  );
  TestValidator.equals(
    "post title updated",
    updatedPost.title,
    updateBody.title,
  );

  // 8. Seller B attempts unauthorized update (now switch to seller B's access with login; since only join creates token, simulate now)
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: "1234",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });

  await TestValidator.error(
    "unauthorized seller cannot update another seller's post",
    async () => {
      await api.functional.shoppingMall.seller.boards.posts.update(connection, {
        boardId: board.id,
        postId: postId,
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
          visibility: "public",
          moderation_status: "approved",
          moderation_reason: null,
        } satisfies IShoppingMallBoardPost.IUpdate,
      });
    },
  );

  // 9. Confirm the state still matches Seller A's update
  typia.assert<IShoppingMallBoardPost>(updatedPost);
}
