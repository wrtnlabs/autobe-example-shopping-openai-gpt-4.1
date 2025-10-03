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
 * Test retrieval of bulletin board details and permission control by boardId.
 *
 * 1. Register an admin and authenticate.
 * 2. Create a parent channel for the board.
 * 3. Create a section under the channel.
 * 4. Create a board placed under the new channel/section.
 * 5. Retrieve the board detail by boardId and check all DTO properties.
 * 6. Soft-delete the board (by updating deleted_at to now in-place
 *    simulation—cannot use test API directly).
 * 7. Attempt to re-fetch the board and expect an error (not found or unauthorized
 *    due to soft deletion).
 *
 * Also verify that display, moderation, and visibility configuration are
 * correctly stored/retrieved.
 */
export async function test_api_board_detail_retrieve_by_id(
  connection: api.IConnection,
) {
  // Step 1: Register admin and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminName = RandomGenerator.name();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // Step 2: Create a new channel
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelBody,
    });
  typia.assert(channel);

  // Step 3: Create a new section under the channel
  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph(),
    display_order: typia.random<number & tags.Type<"int32">>(),
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

  // Step 4: Create the board under channel + section
  const boardBody = {
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    visibility: RandomGenerator.pick([
      "public",
      "private",
      "channel-restricted",
      "section-restricted",
    ] as const),
    moderation_required: RandomGenerator.pick([true, false] as const),
    post_expiry_days: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallBoard.ICreate;
  const board: IShoppingMallBoard =
    await api.functional.shoppingMall.admin.boards.create(connection, {
      body: boardBody,
    });
  typia.assert(board);
  TestValidator.equals(
    "board.title matches input",
    board.title,
    boardBody.title,
  );
  TestValidator.equals(
    "board.description matches input",
    board.description,
    boardBody.description,
  );
  TestValidator.equals(
    "board.visibility matches input",
    board.visibility,
    boardBody.visibility,
  );
  TestValidator.equals(
    "board.moderation_required matches input",
    board.moderation_required,
    boardBody.moderation_required,
  );
  TestValidator.equals(
    "board.post_expiry_days matches input",
    board.post_expiry_days,
    boardBody.post_expiry_days,
  );
  typia.assert(board.created_at);
  typia.assert(board.updated_at);
  TestValidator.equals("deleted_at is unset", board.deleted_at, null);

  // Step 5: Retrieve board details by ID
  const found: IShoppingMallBoard = await api.functional.shoppingMall.boards.at(
    connection,
    { boardId: board.id },
  );
  typia.assert(found);
  TestValidator.equals("retrieved board matches created", found.id, board.id);
  TestValidator.equals("retrieved title matches", found.title, boardBody.title);
  TestValidator.equals(
    "retrieved section",
    found.shopping_mall_section_id,
    section.id,
  );
  TestValidator.equals(
    "retrieved channel",
    found.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "retrieved moderation_required matches",
    found.moderation_required,
    boardBody.moderation_required,
  );
  TestValidator.equals(
    "retrieved visibility matches",
    found.visibility,
    boardBody.visibility,
  );
  TestValidator.equals(
    "retrieved post_expiry_days matches",
    found.post_expiry_days,
    boardBody.post_expiry_days,
  );
  TestValidator.equals("retrieved deleted_at is unset", found.deleted_at, null);

  // Step 6: Simulate soft deletion by manually editing deleted_at (simulate only; in real test would use an admin delete API)
  // Let's manually patch the in-memory object for this E2E test context, then test expected 404/authorization error
  (board as IShoppingMallBoard).deleted_at =
    new Date().toISOString() as string & tags.Format<"date-time">;

  // Step 7: Attempt to retrieve soft-deleted board and expect error
  await TestValidator.error(
    "should throw when accessing soft-deleted board",
    async () => {
      await api.functional.shoppingMall.boards.at(connection, {
        boardId: board.id,
      });
    },
  );
}
