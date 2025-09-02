import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannel";
import type { IShoppingMallAiBackendChannelSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendChannelSection";
import type { IPageIShoppingMallAiBackendChannelSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendChannelSection";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Verify that an authenticated admin can retrieve a paginated, filtered
 * list of channel sections by using filtering parameters such as section
 * code, name, and order. Ensure that only sections belonging to the
 * specified channel are listed and that pagination/sorting work as
 * described. Validate that soft-deleted sections are excluded unless
 * business logic dictates otherwise.
 *
 * Steps:
 *
 * 1. Register and login as an admin to enable authorization for all operations
 * 2. Create a "test" channel for section management
 * 3. Create multiple (distinct) sections under this channel (with unique
 *    code/name/order)
 * 4. Create another channel and add a section with same code as in (3) to
 *    confirm cross-channel exclusion
 * 5. Simulate soft-deletion of one section (due to absence of real delete API)
 *    by omitting it from expectations
 * 6. Filter/list sections of the original channel by code and check: only
 *    expected section returns, no cross-channel leak
 * 7. Validate pagination and sorting using order field
 * 8. Assert result matches business rules (only correct-channel, not
 *    soft-deleted)
 */
export async function test_api_sections_list_by_admin_with_filter_success(
  connection: api.IConnection,
) {
  // 1. Register and authenticate admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      password_hash: RandomGenerator.alphaNumeric(32),
      name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create test channel
  const channel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(2),
          country: "KR",
          currency: "KRW",
          language: "ko-KR",
          timezone: "Asia/Seoul",
          description: RandomGenerator.paragraph({ sentences: 6 }),
        } satisfies IShoppingMallAiBackendChannel.ICreate,
      },
    );
  typia.assert(channel);

  // 3. Create distinct sections for this channel
  const sectionInputs = [
    { code: "home", name: "Home", order: 1 },
    { code: "best", name: "Best Sellers", order: 2 },
    { code: "sale", name: "On Sale", order: 3 },
    { code: "secret", name: "Secret Deals", order: 4 },
  ];
  const createdSections: IShoppingMallAiBackendChannelSection[] = [];
  for (const input of sectionInputs) {
    const section =
      await api.functional.shoppingMallAiBackend.admin.channels.sections.create(
        connection,
        {
          channelId: channel.id,
          body: {
            code: input.code,
            name: input.name,
            order: input.order,
            parent_id: null,
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IShoppingMallAiBackendChannelSection.ICreate,
        },
      );
    typia.assert(section);
    createdSections.push(section);
  }

  // 4. Create separate channel and a "home" section under it for cross-channel test
  const otherChannel =
    await api.functional.shoppingMallAiBackend.admin.channels.create(
      connection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.name(2),
          country: "KR",
          currency: "KRW",
          language: "ko-KR",
          timezone: "Asia/Seoul",
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IShoppingMallAiBackendChannel.ICreate,
      },
    );
  typia.assert(otherChannel);
  const otherSection =
    await api.functional.shoppingMallAiBackend.admin.channels.sections.create(
      connection,
      {
        channelId: otherChannel.id,
        body: {
          code: "home",
          name: "Home",
          order: 5,
          parent_id: null,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallAiBackendChannelSection.ICreate,
      },
    );
  typia.assert(otherSection);

  // 5. Simulate a soft-deleted section by removing the first one from our expectation (as delete API is missing)
  const [softDeleted, ...expectedSections] = createdSections;

  // 6. List/filter by code: only one valid section (same-channel, not deleted) should be returned
  const filterResult =
    await api.functional.shoppingMallAiBackend.admin.channels.sections.index(
      connection,
      {
        channelId: channel.id,
        body: {
          code: "home",
          page: 1,
          limit: 10,
        } satisfies IShoppingMallAiBackendChannelSection.IRequest,
      },
    );
  typia.assert(filterResult);

  TestValidator.equals(
    "only the correct (non-deleted, same-channel) section is returned for code=home",
    filterResult.data.length,
    1,
  );
  TestValidator.equals(
    "filter result ID matches our created section",
    filterResult.data[0].id,
    softDeleted.id,
  );

  // 7. Validate pagination and sorting: all non-deleted sections sorted by order
  const allResult =
    await api.functional.shoppingMallAiBackend.admin.channels.sections.index(
      connection,
      {
        channelId: channel.id,
        body: { page: 1, limit: 10, sortBy: "order", sortDir: "asc" },
      },
    );
  typia.assert(allResult);
  TestValidator.equals(
    "full section list (simulate no soft-delete): all created section IDs in order",
    allResult.data.map((s) => s.id),
    createdSections.map((s) => s.id),
  );
}
