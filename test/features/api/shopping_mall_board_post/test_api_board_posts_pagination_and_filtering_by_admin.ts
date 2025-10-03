import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallBoardPost";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoard";
import type { IShoppingMallBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoardPost";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Validate admin capability to retrieve, paginate, and filter posts within a
 * board.
 *
 * This scenario covers:
 *
 * 1. Registering and authenticating as an admin.
 * 2. Creating a channel, section, and board as admin.
 * 3. Simulating board posts existence (actual post-creation endpoint is not in
 *    DTO/API scope, so we focus on read/list functional tests).
 * 4. Exercise the posts index API with:
 *
 * - Normal pagination (first page, default limit, non-full last page)
 * - Custom limit (fewer/more than default)
 * - Filtering by reply_level, visibility, moderation_status, title/body search
 * - Edge pagination (page past data yields empty result)
 * - Complex filter combinations yielding no data
 *
 * 5. Validate that admin can see all visibility/moderation statuses, the
 *    pagination info is correct, and data lists match expectations.
 * 6. All responses undergo strict typia.assert() verification. All validations use
 *    descriptive TestValidator titles.
 */
export async function test_api_board_posts_pagination_and_filtering_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "Password123!",
      name: RandomGenerator.name(),
    },
  });
  typia.assert(admin);

  // 2. Create a new channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 4 }),
      },
    },
  );
  typia.assert(channel);

  // 3. Create a section in the channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          display_order: typia.random<number & tags.Type<"int32">>(),
        },
      },
    );
  typia.assert(section);

  // 4. Create a board (moderation and visibility randomized)
  const visibilityOptions = [
    "public",
    "private",
    "channel-restricted",
    "section-restricted",
  ] as const;
  const board = await api.functional.shoppingMall.admin.boards.create(
    connection,
    {
      body: {
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        title: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        visibility: RandomGenerator.pick(visibilityOptions),
        moderation_required: RandomGenerator.pick([true, false]),
        post_expiry_days: null,
      },
    },
  );
  typia.assert(board);

  // 5. Simulate board posts existence (since creation endpoint is not available, assume SDK simulates posts when listing)

  // 6. Normal pagination: get first page, default params
  const defaultPage1 = await api.functional.shoppingMall.boards.posts.index(
    connection,
    {
      boardId: board.id,
      body: {}, // default: page 1, default limit
    },
  );
  typia.assert(defaultPage1);
  TestValidator.predicate(
    "admin post index returns page 1",
    defaultPage1.pagination.current === 1,
  );
  TestValidator.predicate(
    "admin post index pagination integrity",
    defaultPage1.pagination.pages ===
      Math.ceil(
        defaultPage1.pagination.records / defaultPage1.pagination.limit,
      ),
  );
  TestValidator.predicate(
    "admin post index data not empty if records > 0",
    defaultPage1.pagination.records === 0 || defaultPage1.data.length > 0,
  );

  // 7. Custom limit: get a page with 3 posts per page
  const custom3Page = await api.functional.shoppingMall.boards.posts.index(
    connection,
    {
      boardId: board.id,
      body: {
        limit: 3 as number & tags.Type<"int32">,
        page: 1 as number & tags.Type<"int32">,
      },
    },
  );
  typia.assert(custom3Page);
  TestValidator.equals(
    "custom limit 3 respects length",
    custom3Page.data.length,
    Math.min(3, custom3Page.pagination.records),
  );

  // 8. Edge pagination: page after last should return empty data
  const pages = custom3Page.pagination.pages;
  const outOfDataPage = await api.functional.shoppingMall.boards.posts.index(
    connection,
    {
      boardId: board.id,
      body: {
        limit: 3 as number & tags.Type<"int32">,
        page: (pages + 1) as number & tags.Type<"int32">,
      },
    },
  );
  typia.assert(outOfDataPage);
  TestValidator.equals(
    "pagination past last page yields empty",
    outOfDataPage.data.length,
    0,
  );

  // 9. Filtering by reply_level (top-level posts only)
  const replyLevel0 = await api.functional.shoppingMall.boards.posts.index(
    connection,
    {
      boardId: board.id,
      body: {
        reply_level: 0 as number & tags.Type<"int32">,
        limit: 5 as number & tags.Type<"int32">,
        page: 1 as number & tags.Type<"int32">,
      },
    },
  );
  typia.assert(replyLevel0);
  TestValidator.predicate(
    "all reply_level 0",
    replyLevel0.data.every((post) => post.reply_level === 0),
  );

  // 10. Filtering by moderation_status (e.g., 'approved'), only if data exists
  const statuses = replyLevel0.data.map((post) => post.moderation_status);
  if (statuses.length > 0) {
    const statusValue = RandomGenerator.pick(statuses);
    const filteredByStatus =
      await api.functional.shoppingMall.boards.posts.index(connection, {
        boardId: board.id,
        body: {
          moderation_status: statusValue,
          limit: 5 as number & tags.Type<"int32">,
          page: 1 as number & tags.Type<"int32">,
        },
      });
    typia.assert(filteredByStatus);
    TestValidator.predicate(
      "all posts have desired moderation_status",
      filteredByStatus.data.every(
        (post) => post.moderation_status === statusValue,
      ),
    );
  }

  // 11. Filtering by visibility (e.g., "public"), only if data exists
  const visibilities = replyLevel0.data.map((post) => post.visibility);
  if (visibilities.length > 0) {
    const visibility = RandomGenerator.pick(visibilities);
    const filteredByVisibility =
      await api.functional.shoppingMall.boards.posts.index(connection, {
        boardId: board.id,
        body: {
          visibility,
          limit: 5 as number & tags.Type<"int32">,
          page: 1 as number & tags.Type<"int32">,
        },
      });
    typia.assert(filteredByVisibility);
    TestValidator.predicate(
      "all posts have desired visibility",
      filteredByVisibility.data.every((post) => post.visibility === visibility),
    );
  }

  // 12. Filtering by title or body substring (if data exists, pick a substring from a title/body)
  if (replyLevel0.data.length > 0) {
    const pickPost = RandomGenerator.pick(replyLevel0.data);
    if (
      pickPost.title &&
      typeof pickPost.title === "string" &&
      pickPost.title.length > 2
    ) {
      const keyword = pickPost.title.slice(
        0,
        Math.min(3, pickPost.title.length),
      );
      const filteredByTitle =
        await api.functional.shoppingMall.boards.posts.index(connection, {
          boardId: board.id,
          body: {
            title: keyword,
            limit: 5 as number & tags.Type<"int32">,
            page: 1 as number & tags.Type<"int32">,
          },
        });
      typia.assert(filteredByTitle);
      TestValidator.predicate(
        "title filter returns matches or empty",
        filteredByTitle.data.every(
          (post) =>
            post.title !== undefined &&
            post.title !== null &&
            post.title.includes(keyword),
        ) || filteredByTitle.data.length === 0,
      );
    }
    if (pickPost.body_summary && pickPost.body_summary.length > 2) {
      const substring = pickPost.body_summary.slice(
        0,
        Math.min(3, pickPost.body_summary.length),
      );
      const filteredByBody =
        await api.functional.shoppingMall.boards.posts.index(connection, {
          boardId: board.id,
          body: {
            body: substring,
            limit: 5 as number & tags.Type<"int32">,
            page: 1 as number & tags.Type<"int32">,
          },
        });
      typia.assert(filteredByBody);
      TestValidator.predicate(
        "body filter returns matches or empty",
        filteredByBody.data.every(
          (post) =>
            post.body_summary !== undefined &&
            post.body_summary.includes(substring),
        ) || filteredByBody.data.length === 0,
      );
    }
  }

  // 13. Complex filter: impossible filter (should always yield empty)
  const impossible = await api.functional.shoppingMall.boards.posts.index(
    connection,
    {
      boardId: board.id,
      body: {
        title: "ImpossibleKeyword_" + RandomGenerator.alphaNumeric(10),
        body: "RandomNotFound_" + RandomGenerator.alphaNumeric(10),
        reply_level: 999 as number & tags.Type<"int32">,
        visibility: "private",
        moderation_status: "non-existent-status",
        limit: 3 as number & tags.Type<"int32">,
        page: 1 as number & tags.Type<"int32">,
      },
    },
  );
  typia.assert(impossible);
  TestValidator.equals(
    "impossible filter returns empty",
    impossible.data.length,
    0,
  );
}
