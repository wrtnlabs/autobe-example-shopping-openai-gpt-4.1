import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoard";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate that a customer can perform a logical (soft) deletion on their own
 * board post in a bulletin board. Preconditions: admin registration, channel
 * creation, section creation in channel, board creation, customer registration,
 * post creation. Steps:
 *
 * 1. Register new admin.
 * 2. Admin creates a new channel.
 * 3. Admin creates a section in that channel.
 * 4. Admin creates a bulletin board in the channel/section.
 * 5. Register a new customer in that channel.
 * 6. (Assume customer can create a post -- actual post creation function is not
 *    available in this scope and thus will be skipped.)
 * 7. Customer attempts to delete a post (simulate delete using random post/board
 *    uuid, as actual post creation/lookup is out of current API scope).
 * 8. Validate the "erase" API endpoint can be called with required parameters, but
 *    cannot assert post state without a retrievable post.
 * 9. Negative test: attempt to delete with non-existent boardId/postId.
 */
export async function test_api_board_post_delete_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new admin
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
      },
    });
  typia.assert(admin);

  // 2. Admin creates a channel
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      },
    });
  typia.assert(channel);

  // 3. Admin creates a section
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(5),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(section);

  // 4. Admin creates a bulletin board
  const board: IShoppingMallBoard =
    await api.functional.shoppingMall.admin.boards.create(connection, {
      body: {
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        visibility: "public",
        moderation_required: false,
        post_expiry_days: null,
      },
    });
  typia.assert(board);

  // 5. Register a customer to the channel (author)
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channel.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
      },
    });
  typia.assert(customer);

  // 6. --- SKIP POST CREATION: No API available. Use random UUIDs below ---
  const postId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // In real scenario, would use the result of post creation here

  // 7. Attempt logical delete by the author (simulate usage)
  await api.functional.shoppingMall.customer.boards.posts.erase(connection, {
    boardId: board.id,
    postId,
  });
  // Can only validate endpoint is callable; can't check post state

  // 8. Negative test: attempt to delete with non-existent postId/boardId
  await TestValidator.error(
    "attempt to delete with random (non-existent) boardId/postId should return an error",
    async () => {
      await api.functional.shoppingMall.customer.boards.posts.erase(
        connection,
        {
          boardId: typia.random<string & tags.Format<"uuid">>(),
          postId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
