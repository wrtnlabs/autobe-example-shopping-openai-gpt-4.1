import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoard";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate soft deletion of a seller's bulletin board post (conceptual, as post
 * creation/listing APIs are not available).
 *
 * Business Steps:
 *
 * 1. Onboard an admin (to create channel, section, and board).
 * 2. Create a channel via admin API.
 * 3. Create a section for that channel via admin API.
 * 4. Create a board under the new channel/section via admin API.
 * 5. Register a seller assigned to the created channel/section, representing a
 *    user who will own the board post.
 * 6. (CONCEPTUAL, NOT IMPLEMENTED) Post creation by seller (this step is not
 *    possible to implement as there is no post creation API), so postId uses
 *    random/test uuid.
 * 7. Seller attempts to delete 'their own post' via
 *    api.functional.shoppingMall.seller.boards.posts.erase. This is tested for
 *    correct uuid type and call success (no actual persistence validated).
 * 8. Negative test: Seller attempts to delete another seller's/post author's post
 *    (random other uuid) - should expect error.
 * 9. Negative test: Attempt to delete already deleted/invalid post id (random
 *    uuid, call twice) - should expect error.
 * 10. Negative test: Attempt deletion without prerequisite records (skipped as
 *     entities would not exist).
 *
 * Note: Assertion is limited to API invocation and error validation as post
 * entity and retrieval endpoints are not available in materials.
 * Type/permission errors are validated using TestValidator.error.
 */
export async function test_api_board_post_delete_by_seller(
  connection: api.IConnection,
) {
  // 1. Onboard admin account
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(6),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
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
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create bulletin board
  const board = await api.functional.shoppingMall.admin.boards.create(
    connection,
    {
      body: {
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        visibility: "public",
        moderation_required: false,
        post_expiry_days: null,
      } satisfies IShoppingMallBoard.ICreate,
    },
  );
  typia.assert(board);

  // 5. Register seller assigned to channel/section
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      shopping_mall_channel_id: channel.id,
      shopping_mall_section_id: section.id,
      profile_name: RandomGenerator.name(1),
      kyc_status: "pending",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);

  // 6. (Conceptual) Create post and assign a test postId as no endpoint available
  const testPostId = typia.random<string & tags.Format<"uuid">>();

  // 7. Seller deletes own post (validate API call accepts uuid/boardId, no validation of effect)
  await api.functional.shoppingMall.seller.boards.posts.erase(connection, {
    boardId: board.id,
    postId: testPostId,
  });

  // 8. Seller tries to delete another post (random other uuid, should error)
  await TestValidator.error("seller cannot delete another's post", async () => {
    await api.functional.shoppingMall.seller.boards.posts.erase(connection, {
      boardId: board.id,
      postId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 9. Attempt to delete already deleted/nonexistent post
  await api.functional.shoppingMall.seller.boards.posts.erase(connection, {
    boardId: board.id,
    postId: testPostId,
  });
  // Next attempt must error
  await TestValidator.error("cannot delete already deleted post", async () => {
    await api.functional.shoppingMall.seller.boards.posts.erase(connection, {
      boardId: board.id,
      postId: testPostId,
    });
  });

  // 10. Cannot test missing prerequisites as entities must exist for API call
}
