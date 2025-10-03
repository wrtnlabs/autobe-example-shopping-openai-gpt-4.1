import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoard";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Test the complete end-to-end flow of admin updating a shopping mall board.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin (obtain access token)
 * 2. Create a channel as admin
 * 3. Create a section under that channel
 * 4. Create a new board, specifying channel and section
 * 5. Update all updatable properties of the board (title, description, visibility,
 *    moderation requirement, post expiry)
 * 6. Assert: All targeted fields are updated and match the new values
 * 7. Assert: Updated_at timestamp is different (board update reflected)
 * 8. Negative: Attempt to update as unauthenticated user – expect error
 * 9. Negative: Attempt to update non-existent board – expect error
 * 10. Test business rule: Cannot create duplicate 'main' (e.g., visibility=public,
 *     title clash) boards in same channel (if enforced)
 */
export async function test_api_board_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const name = RandomGenerator.name();
  const admin = await api.functional.auth.admin.join(connection, {
    body: { email, password, name },
  });
  typia.assert(admin);

  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(channel);

  // 3. Create section in the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(section);

  // 4. Create board
  const board = await api.functional.shoppingMall.admin.boards.create(
    connection,
    {
      body: {
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        visibility: RandomGenerator.pick([
          "public",
          "private",
          "channel-restricted",
          "section-restricted",
        ] as const),
        moderation_required: RandomGenerator.pick([true, false] as const),
        post_expiry_days: typia.random<number & tags.Type<"int32">>(),
      },
    },
  );
  typia.assert(board);

  // 5. Update all updatable properties
  const updateBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    visibility: RandomGenerator.pick([
      "public",
      "private",
      "channel-restricted",
      "section-restricted",
    ] as const),
    moderation_required: !board.moderation_required,
    post_expiry_days: ((board.post_expiry_days ?? 10) + 5) as number &
      tags.Type<"int32">,
  } satisfies IShoppingMallBoard.IUpdate;
  const updated = await api.functional.shoppingMall.admin.boards.update(
    connection,
    {
      boardId: board.id,
      body: updateBody,
    },
  );
  typia.assert(updated);
  TestValidator.equals("board id after update", updated.id, board.id);
  TestValidator.notEquals(
    "updated_at changed",
    updated.updated_at,
    board.updated_at,
  );
  TestValidator.equals("title updated", updated.title, updateBody.title);
  TestValidator.equals(
    "description updated",
    updated.description,
    updateBody.description,
  );
  TestValidator.equals(
    "visibility updated",
    updated.visibility,
    updateBody.visibility,
  );
  TestValidator.equals(
    "moderation_required updated",
    updated.moderation_required,
    updateBody.moderation_required,
  );
  TestValidator.equals(
    "post_expiry_days updated",
    updated.post_expiry_days,
    updateBody.post_expiry_days,
  );

  // 8. Unauthorized: Try to update board with unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot update board",
    async () => {
      await api.functional.shoppingMall.admin.boards.update(unauthConn, {
        boardId: board.id,
        body: updateBody,
      });
    },
  );

  // 9. Non-existent board update
  await TestValidator.error("cannot update non-existent board", async () => {
    await api.functional.shoppingMall.admin.boards.update(connection, {
      boardId: typia.random<string & tags.Format<"uuid">>(),
      body: updateBody,
    });
  });
}
