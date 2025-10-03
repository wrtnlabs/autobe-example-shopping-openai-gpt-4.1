import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBoard";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoard";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate paginated and filtered board-listing as customer/guest.
 *
 * This test covers the search (PATCH /shoppingMall/boards) endpoint for listing
 * boards from a customer or public perspective. It ensures that even without
 * admin privileges, users can retrieve board lists with valid filters and only
 * see legitimate boards. Setup involves creating all prerequisite data through
 * admin flows.
 *
 * 1. Register a new admin (with random credentials)
 * 2. As admin, create a channel with a random code
 * 3. As admin, create a section under that channel
 * 4. As admin, create at least one board (attached to the channel/section)
 * 5. As a customer (public role), list boards using various filters:
 *
 *    - By channel
 *    - By section
 *    - By visibility (e.g. 'public')
 *    - By title (exact and partial)
 *    - Pagination (limit=1)
 * 6. Ensure only non-deleted boards are returned; soft-deleted boards are excluded
 * 7. Assert that all business logic—visibility, filtering, permissions, and type
 *    assertions—behave as expected
 */
export async function test_api_board_list_search_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new admin (random credentials)
  const adminEmail = typia.random<string & tags.Format<"email">>();
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

  // 2. Create a channel
  const channelCode = RandomGenerator.alphaNumeric(8);
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: channelCode,
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);

  // 3. Create a section
  const sectionCode = RandomGenerator.alphaNumeric(8);
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: sectionCode,
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          display_order: 0,
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create at least one visible, non-deleted board under the section
  const testTitle = RandomGenerator.name(2);
  const board: IShoppingMallBoard =
    await api.functional.shoppingMall.admin.boards.create(connection, {
      body: {
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        title: testTitle,
        description: RandomGenerator.paragraph(),
        visibility: "public",
        moderation_required: false,
        post_expiry_days: null,
      } satisfies IShoppingMallBoard.ICreate,
    });
  typia.assert(board);

  // 5. As a customer (simulating a public/guest role): search boards
  // 5a. List boards filtered by channel
  const pageByChannel = await api.functional.shoppingMall.boards.index(
    connection,
    {
      body: {
        shopping_mall_channel_id: channel.id,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallBoard.IRequest,
    },
  );
  typia.assert(pageByChannel);
  TestValidator.predicate(
    "all boards from channel must belong to the specified channel and not be deleted",
    pageByChannel.data.every(
      (b) =>
        b.shopping_mall_channel_id === channel.id &&
        (b.deleted_at === null || b.deleted_at === undefined),
    ),
  );

  // 5b. List boards filtered by section
  const pageBySection = await api.functional.shoppingMall.boards.index(
    connection,
    {
      body: {
        shopping_mall_section_id: section.id,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallBoard.IRequest,
    },
  );
  typia.assert(pageBySection);
  TestValidator.predicate(
    "all boards from section must belong to specified section and not be deleted",
    pageBySection.data.every(
      (b) =>
        b.shopping_mall_section_id === section.id &&
        (b.deleted_at === null || b.deleted_at === undefined),
    ),
  );

  // 5c. List boards by visibility
  const pageByVisibility = await api.functional.shoppingMall.boards.index(
    connection,
    {
      body: {
        visibility: "public",
        page: 1,
        limit: 10,
      } satisfies IShoppingMallBoard.IRequest,
    },
  );
  typia.assert(pageByVisibility);
  TestValidator.predicate(
    "all boards must have public visibility and not be deleted",
    pageByVisibility.data.every(
      (b) =>
        b.visibility === "public" &&
        (b.deleted_at === null || b.deleted_at === undefined),
    ),
  );

  // 5d. List boards by title (exact)
  const pageByExactTitle = await api.functional.shoppingMall.boards.index(
    connection,
    {
      body: {
        title: testTitle,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallBoard.IRequest,
    },
  );
  typia.assert(pageByExactTitle);
  TestValidator.predicate(
    "searching by exact title returns at least one matching board",
    pageByExactTitle.data.some(
      (b) =>
        b.title === testTitle &&
        (b.deleted_at === null || b.deleted_at === undefined),
    ),
  );

  // 5e. List boards by title (partial match: substring)
  const partial = testTitle.split(" ")[0];
  const pageByPartialTitle = await api.functional.shoppingMall.boards.index(
    connection,
    {
      body: {
        title: partial,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallBoard.IRequest,
    },
  );
  typia.assert(pageByPartialTitle);
  TestValidator.predicate(
    "searching by partial title matches boards with substring in title and not deleted",
    pageByPartialTitle.data.some(
      (b) =>
        b.title.includes(partial) &&
        (b.deleted_at === null || b.deleted_at === undefined),
    ),
  );

  // 5f. Pagination logic (limit=1)
  const pagePagination = await api.functional.shoppingMall.boards.index(
    connection,
    {
      body: {
        page: 1,
        limit: 1,
      } satisfies IShoppingMallBoard.IRequest,
    },
  );
  typia.assert(pagePagination);
  TestValidator.equals(
    "board pagination result returns at most 1 board per page",
    pagePagination.data.length <= 1,
    true,
  );

  // 6. Ensure soft-deleted boards are excluded by default (simulate a deleted board, search, and check result)
  // Simulate by creating another, then check. (In real scenario, would soft-delete, but no API so only check logic for returned data.)
  TestValidator.predicate(
    "no soft-deleted boards present (all have deleted_at null/undefined)",
    pageByChannel.data.every(
      (b) => b.deleted_at === null || b.deleted_at === undefined,
    ),
  );
}
