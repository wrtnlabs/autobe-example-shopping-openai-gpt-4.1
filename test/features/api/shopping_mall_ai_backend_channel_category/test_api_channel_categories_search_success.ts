import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelCategory";
import type { IPageIShoppingMallAiBackendChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendChannelCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test: Admin paginates and filters channel categories for a given
 * channel.
 *
 * This test simulates a real admin workflow for managing product categories
 * in a channel in the context of a shopping mall AI backend. It verifies
 * the correctness and integrity of the PATCH
 * /shoppingMallAiBackend/admin/channels/{channelId}/categories endpoint
 * under diverse real-world filtering and pagination settings.
 *
 * Steps:
 *
 * 1. Register an admin account via /auth/admin/join and ensure that
 *    Authorization is properly attached for subsequent requests.
 * 2. Create a channel via /shoppingMallAiBackend/admin/channels, validating
 *    the result.
 * 3. Create several categories under this channel:
 *
 *    - Multiple top-level categories (distinct code, name)
 *    - Nested subcategories (linked via parent_id)
 *    - A mix of 'active' and 'inactive' (inactive is emulated by populating
 *         deleted_at)
 * 4. Register a second channel with unrelated categories for isolation checks.
 * 5. For the main channel, exercise the category search endpoint (PATCH
 *    /shoppingMallAiBackend/admin/channels/{channelId}/categories) with:
 *
 *    - Pagination (limit, page)
 *    - Filtering by code (exact)
 *    - Filtering by name (partial, case match)
 *    - Filtering by parent_id (fetch subcategories)
 *    - Filtering by is_active (active/inactive categories)
 *    - Combined filters (e.g., parent_id + is_active)
 * 6. Each search response is validated by manually filtering prepared
 *    categories for a ground truth set, then comparing the API's response
 *    data and pagination values with the expected results using
 *    TestValidator.equals.
 * 7. Ensure categories from other channels are never returned for this channel
 *    (channel-level isolation check).
 *
 * All identifiers, codes and names are chosen deterministically for
 * traceability in test assertions. The test exercises all major category
 * search concerns for the channel management context.
 */
export async function test_api_channel_categories_search_success(
  connection: api.IConnection,
) {
  // 1. Register an admin account
  const adminUsername = RandomGenerator.alphabets(8);
  const adminEmail = `${RandomGenerator.alphabets(8)}@e2e.test`;
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminName = RandomGenerator.name();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword, // For tests, store as-is
      name: adminName,
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);
  // connection.headers.Authorization is set automatically

  // 2. Create the primary channel
  const channelCode = `ch-e2e-${RandomGenerator.alphaNumeric(5)}`;
  const channelName = RandomGenerator.name(2);
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      {
        body: {
          code: channelCode,
          name: channelName,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          country: "KR",
          currency: "KRW",
          language: "ko",
          timezone: "Asia/Seoul",
        } satisfies IShoppingMallAiBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 3. Create test categories in this channel
  // - catA: top-level, active
  // - catB: top-level, inactive
  // - catC: top-level, active w/ subcategory
  // - catD: subcategory under catC, active
  const categoryA =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_ai_backend_channel_id: channel.id,
          code: "catA",
          name: "Electronics",
          order: 1,
          description: "Top-level active",
        } satisfies IShoppingMallAiBackendChannelCategory.ICreate,
      },
    );
  typia.assert(categoryA);

  const now = new Date();
  const pastDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const categoryB =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_ai_backend_channel_id: channel.id,
          code: "catB",
          name: "INACTIVE cat",
          order: 2,
          description: "Top-level inactive",
        } satisfies IShoppingMallAiBackendChannelCategory.ICreate,
      },
    );
  typia.assert(categoryB);
  // Simulate soft-delete/inactive by overwriting in local copy later

  const categoryC =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_ai_backend_channel_id: channel.id,
          code: "catC",
          name: "Clothing",
          order: 3,
          description: "Top Clothing",
        } satisfies IShoppingMallAiBackendChannelCategory.ICreate,
      },
    );
  typia.assert(categoryC);

  const categoryD =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_ai_backend_channel_id: channel.id,
          parent_id: categoryC.id,
          code: "catD",
          name: "Kidswear",
          order: 1,
          description: "Subcat of Clothing",
        } satisfies IShoppingMallAiBackendChannelCategory.ICreate,
      },
    );
  typia.assert(categoryD);

  // Build our test "truth" database (simulate is_active via deleted_at)
  const categories = [
    { ...categoryA },
    { ...categoryB, deleted_at: pastDate }, // Inactive (simulate)
    { ...categoryC },
    { ...categoryD },
  ];

  // 4. Setup a second channel and some categories to validate isolation
  const channel2 =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      {
        body: {
          code: `ch-e2e-${RandomGenerator.alphaNumeric(5)}`,
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          country: "KR",
          currency: "KRW",
          language: "ko",
          timezone: "Asia/Seoul",
        } satisfies IShoppingMallAiBackendChannel.ICreate,
      },
    );
  typia.assert(channel2);
  const otherCat =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.create(
      connection,
      {
        channelId: channel2.id,
        body: {
          shopping_mall_ai_backend_channel_id: channel2.id,
          code: "otherCat",
          name: "Other Channel Category",
          order: 1,
          description: "Should not appear for main channel",
        } satisfies IShoppingMallAiBackendChannelCategory.ICreate,
      },
    );
  typia.assert(otherCat);

  // Filtering/pagination search tests
  // Helper functions
  const getActive = (arr: typeof categories) =>
    arr.filter((c) => !c.deleted_at);
  const getInactive = (arr: typeof categories) =>
    arr.filter((c) => !!c.deleted_at);
  const pageLimit = 2;

  // 5a. No filter, page 1
  let resp =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.index(
      connection,
      {
        channelId: channel.id,
        body: {
          page: 1,
          limit: pageLimit,
        } satisfies IShoppingMallAiBackendChannelCategory.IRequest,
      },
    );
  typia.assert(resp);
  let expected = categories.slice(0, pageLimit);
  TestValidator.equals("pagination, no filter: data", resp.data, expected);
  TestValidator.equals(
    "pagination, no filter: count",
    resp.pagination.records,
    categories.length,
  );

  // 5b. By code (exact, exists)
  resp =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.index(
      connection,
      {
        channelId: channel.id,
        body: {
          code: "catA",
        } satisfies IShoppingMallAiBackendChannelCategory.IRequest,
      },
    );
  typia.assert(resp);
  expected = categories.filter((c) => c.code === "catA");
  TestValidator.equals("filter: by code - data", resp.data, expected);

  // 5c. By code (nonexistent)
  resp =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.index(
      connection,
      {
        channelId: channel.id,
        body: {
          code: "no_such_code",
        } satisfies IShoppingMallAiBackendChannelCategory.IRequest,
      },
    );
  typia.assert(resp);
  expected = [];
  TestValidator.equals("filter: by code (none) - data", resp.data, expected);

  // 5d. By name (partial match, should find 'Electronics')
  resp =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.index(
      connection,
      {
        channelId: channel.id,
        body: {
          name: "Electro",
        } satisfies IShoppingMallAiBackendChannelCategory.IRequest,
      },
    );
  typia.assert(resp);
  expected = categories.filter((c) => c.name.includes("Electro"));
  TestValidator.equals("filter: by name (partial)", resp.data, expected);

  // 5e. parent_id: find all subcategories of catC
  resp =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.index(
      connection,
      {
        channelId: channel.id,
        body: {
          parent_id: categoryC.id,
        } satisfies IShoppingMallAiBackendChannelCategory.IRequest,
      },
    );
  typia.assert(resp);
  expected = categories.filter((c) => c.parent_id === categoryC.id);
  TestValidator.equals("filter: parent_id", resp.data, expected);

  // 5f. is_active = true (simulate: deleted_at == null)
  resp =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.index(
      connection,
      {
        channelId: channel.id,
        body: {
          is_active: true,
        } satisfies IShoppingMallAiBackendChannelCategory.IRequest,
      },
    );
  typia.assert(resp);
  expected = getActive(categories);
  TestValidator.equals("filter: is_active==true", resp.data, expected);

  // 5g. is_active = false
  resp =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.index(
      connection,
      {
        channelId: channel.id,
        body: {
          is_active: false,
        } satisfies IShoppingMallAiBackendChannelCategory.IRequest,
      },
    );
  typia.assert(resp);
  expected = getInactive(categories);
  TestValidator.equals("filter: is_active==false", resp.data, expected);

  // 5h. Combined filter: parent_id + is_active
  resp =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.index(
      connection,
      {
        channelId: channel.id,
        body: {
          parent_id: categoryC.id,
          is_active: true,
        } satisfies IShoppingMallAiBackendChannelCategory.IRequest,
      },
    );
  typia.assert(resp);
  expected = getActive(categories).filter((c) => c.parent_id === categoryC.id);
  TestValidator.equals("combined: parent_id+is_active", resp.data, expected);

  // 6. Isolation: category search for primary channel never returns other channel's categories
  resp =
    await api.functional.shoppingMallAiBackend.admin.channels.categories.index(
      connection,
      {
        channelId: channel.id,
        body: {} satisfies IShoppingMallAiBackendChannelCategory.IRequest,
      },
    );
  typia.assert(resp);
  // Should never include otherCat
  TestValidator.predicate(
    "isolation: no categories from other channels appear",
    resp.data.every(
      (cat) => cat.shopping_mall_ai_backend_channel_id === channel.id,
    ),
  );
}
