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
 * Validates administrator board creation flows:
 *
 * 1. Register an admin (obtaining privileged session)
 * 2. Create a channel (required for board placement)
 * 3. Create a section within the channel
 * 4. Create a board with required configuration
 * 5. Confirm board entity includes all business/audit fields
 * 6. Attempt duplicate board to check for correct business rule error
 *
 * The test focuses on business logic, uniqueness of boards per channel/section,
 * required configuration, and presence of compliance/audit fields.
 */
export async function test_api_board_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration & login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: adminName,
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(adminAuth);
  TestValidator.equals("admin email matches", adminAuth.email, adminEmail);
  TestValidator.equals("admin name matches", adminAuth.name, adminName);
  TestValidator.predicate("admin token present", !!adminAuth.token.access);

  // 2. Create a unique channel
  const channelCode = RandomGenerator.alphaNumeric(8);
  const channelName = RandomGenerator.name();
  const channelDescription = RandomGenerator.paragraph();
  const channelInput = {
    code: channelCode,
    name: channelName,
    description: channelDescription,
  } satisfies IShoppingMallChannel.ICreate;
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: channelInput,
    });
  typia.assert(channel);
  TestValidator.equals(
    "created channel code matches",
    channel.code,
    channelCode,
  );
  TestValidator.equals(
    "created channel name matches",
    channel.name,
    channelName,
  );
  TestValidator.equals(
    "created channel description matches",
    channel.description,
    channelDescription,
  );

  // 3. Create a unique section within the channel
  const sectionCode = RandomGenerator.alphaNumeric(8);
  const sectionName = RandomGenerator.name();
  const sectionDescription = RandomGenerator.paragraph();
  const displayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
  >() satisfies number as number;
  const sectionInput = {
    shopping_mall_channel_id: channel.id,
    code: sectionCode,
    name: sectionName,
    description: sectionDescription,
    display_order: displayOrder,
  } satisfies IShoppingMallSection.ICreate;
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: sectionInput,
      },
    );
  typia.assert(section);
  TestValidator.equals("section code matches", section.code, sectionCode);
  TestValidator.equals(
    "section belongs to channel",
    section.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "section display order",
    section.display_order,
    displayOrder,
  );

  // 4. Create a board linked to the channel & section with proper config
  const boardTitle = RandomGenerator.paragraph({ sentences: 3 });
  const boardDescription = RandomGenerator.content({ paragraphs: 2 });
  const visibility = RandomGenerator.pick([
    "public",
    "private",
    "channel-restricted",
    "section-restricted",
  ] as const);
  const moderationRequired = RandomGenerator.pick([true, false] as const);
  const postExpiryDays = RandomGenerator.pick([null, 7, 30, 90] as const);
  const boardInput = {
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    title: boardTitle,
    description: boardDescription,
    visibility,
    moderation_required: moderationRequired,
    post_expiry_days: postExpiryDays,
  } satisfies IShoppingMallBoard.ICreate;
  const board: IShoppingMallBoard =
    await api.functional.shoppingMall.admin.boards.create(connection, {
      body: boardInput,
    });
  typia.assert(board);
  TestValidator.equals("board title matches", board.title, boardTitle);
  TestValidator.equals(
    "board channel matches",
    board.shopping_mall_channel_id,
    channel.id,
  );
  TestValidator.equals(
    "board section matches",
    board.shopping_mall_section_id,
    section.id,
  );
  TestValidator.equals(
    "board visibility matches",
    board.visibility,
    visibility,
  );
  TestValidator.equals(
    "board moderation flag",
    board.moderation_required,
    moderationRequired,
  );
  TestValidator.equals(
    "board expiry days",
    board.post_expiry_days,
    postExpiryDays,
  );
  TestValidator.predicate(
    "board entity has id",
    typeof board.id === "string" && board.id.length > 0,
  );
  TestValidator.predicate(
    "board audit fields present",
    typeof board.created_at === "string" &&
      typeof board.updated_at === "string",
  );
  TestValidator.equals("board not deleted", board.deleted_at, null);

  // 5. Attempt to create duplicate board in the same channel/section (should fail)
  await TestValidator.error("duplicate board cannot be created", async () => {
    await api.functional.shoppingMall.admin.boards.create(connection, {
      body: boardInput,
    });
  });
}
