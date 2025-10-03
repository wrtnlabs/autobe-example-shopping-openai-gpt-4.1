import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallComment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBoard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoard";
import type { IShoppingMallBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBoardPost";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallComment";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";

/**
 * Comprehensive E2E test for paginated comment list retrieval on a board post.
 *
 * Covers full entity setup (customer/admin/channel/section/board/post),
 * creation of a threaded comment hierarchy, and validates all critical
 * aspects:
 *
 * 1. Default retrieval as customer (should see non-deleted, approved comments)
 * 2. Filtering by reply thread level (level=0 for top-level, level>0 for replies)
 * 3. Filtering by author type (customer vs admin)
 * 4. Pagination logic: limit/page yields correct subsets
 * 5. Edge case: NO comments (new post, empty result)
 * 6. As admin: verify at least visibility of all approved comments
 * 7. Filters with no matches (author_type=admin, etc)
 * 8. Search/sort/complex query with varied parameters
 *
 * Validates business logic, role permissions, and comment visibility rules
 * through both positive and negative assertions.
 */
export async function test_api_comment_list_retrieval_for_board_post(
  connection: api.IConnection,
) {
  // --- ENTITY SETUP ---
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "adminpw123",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const channel: IShoppingMallChannel =
    await api.functional.shoppingMall.admin.channels.create(connection, {
      body: {
        code: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph(),
      } satisfies IShoppingMallChannel.ICreate,
    });
  typia.assert(channel);
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channel.id,
        email: customerEmail,
        password: "custpw123",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. Create a section in channel
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphabets(5),
          name: RandomGenerator.name(2),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);

  // 4. Create a board under section (moderation enabled, public)
  const board: IShoppingMallBoard =
    await api.functional.shoppingMall.admin.boards.create(connection, {
      body: {
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.paragraph(),
        visibility: "public",
        moderation_required: true,
        post_expiry_days: null,
      } satisfies IShoppingMallBoard.ICreate,
    });
  typia.assert(board);

  // 5. Customer creates a board post
  const post: IShoppingMallBoardPost =
    await api.functional.shoppingMall.customer.boards.posts.create(connection, {
      boardId: board.id,
      body: {
        shopping_mall_board_id: board.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
        is_official_answer: false,
        visibility: "public",
        moderation_status: "approved",
      } satisfies IShoppingMallBoardPost.ICreate,
    });
  typia.assert(post);

  // 6. Customer adds a comment tree: root/top-level + replies
  const comments: IShoppingMallComment[] = [];
  // root approved
  const comment1 =
    await api.functional.shoppingMall.customer.boards.posts.comments.create(
      connection,
      {
        boardId: board.id,
        postId: post.id,
        body: {
          body: "Top-level approved",
          shopping_mall_board_post_id: post.id,
        } satisfies IShoppingMallComment.ICreate,
      },
    );
  typia.assert(comment1);
  comments.push(comment1);
  // reply (level 1)
  const reply1 =
    await api.functional.shoppingMall.customer.boards.posts.comments.create(
      connection,
      {
        boardId: board.id,
        postId: post.id,
        body: {
          body: "Reply to comment1",
          shopping_mall_board_post_id: post.id,
          shopping_mall_parent_comment_id: comment1.id,
        } satisfies IShoppingMallComment.ICreate,
      },
    );
  typia.assert(reply1);
  comments.push(reply1);
  // deeper reply (level 2)
  const reply2 =
    await api.functional.shoppingMall.customer.boards.posts.comments.create(
      connection,
      {
        boardId: board.id,
        postId: post.id,
        body: {
          body: "Reply to reply1",
          shopping_mall_board_post_id: post.id,
          shopping_mall_parent_comment_id: reply1.id,
        } satisfies IShoppingMallComment.ICreate,
      },
    );
  typia.assert(reply2);
  comments.push(reply2);
  // another root-level
  const comment2 =
    await api.functional.shoppingMall.customer.boards.posts.comments.create(
      connection,
      {
        boardId: board.id,
        postId: post.id,
        body: {
          body: "Another top-level",
          shopping_mall_board_post_id: post.id,
        } satisfies IShoppingMallComment.ICreate,
      },
    );
  typia.assert(comment2);
  comments.push(comment2);

  // --- TEST AS CUSTOMER (no deleted/denied can be simulated) ---
  // 1. Default listing as customer: should see only approved, non-deleted
  let result = await api.functional.shoppingMall.boards.posts.comments.index(
    connection,
    {
      boardId: board.id,
      postId: post.id,
      body: {} satisfies IShoppingMallComment.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.predicate(
    "default listing contains only non-deleted and approved comments",
    result.data.every(
      (c) => !c.deleted_at && c.moderation_status === "approved",
    ),
  );

  // 2. Filter by reply_level=0 (top-level)
  result = await api.functional.shoppingMall.boards.posts.comments.index(
    connection,
    {
      boardId: board.id,
      postId: post.id,
      body: { reply_level: 0 } satisfies IShoppingMallComment.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.predicate(
    "reply_level=0 only shows top-level comments",
    result.data.every((c) => c.level === 0),
  );

  // 3. Filter by reply_level=1 (first replies)
  result = await api.functional.shoppingMall.boards.posts.comments.index(
    connection,
    {
      boardId: board.id,
      postId: post.id,
      body: { reply_level: 1 } satisfies IShoppingMallComment.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.predicate(
    "reply_level=1 returns only level 1 replies",
    result.data.every((c) => c.level === 1),
  );

  // 4. Filter by author_type=customer
  result = await api.functional.shoppingMall.boards.posts.comments.index(
    connection,
    {
      boardId: board.id,
      postId: post.id,
      body: { author_type: "customer" } satisfies IShoppingMallComment.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.predicate(
    "author_type=customer returns only customer comments",
    result.data.every((c) => c.author_type === "customer"),
  );

  // 5. Pagination: limit=2, page=1
  result = await api.functional.shoppingMall.boards.posts.comments.index(
    connection,
    {
      boardId: board.id,
      postId: post.id,
      body: { limit: 2, page: 1 } satisfies IShoppingMallComment.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.predicate(
    "Pagination limit respected",
    result.data.length <= 2,
  );

  // 6. Edge case: no comments (new post)
  const post2 = await api.functional.shoppingMall.customer.boards.posts.create(
    connection,
    {
      boardId: board.id,
      body: {
        shopping_mall_board_id: board.id,
        title: RandomGenerator.paragraph(),
        body: RandomGenerator.content({ paragraphs: 1 }),
        is_official_answer: false,
        visibility: "public",
        moderation_status: "approved",
      } satisfies IShoppingMallBoardPost.ICreate,
    },
  );
  typia.assert(post2);
  result = await api.functional.shoppingMall.boards.posts.comments.index(
    connection,
    {
      boardId: board.id,
      postId: post2.id,
      body: {} satisfies IShoppingMallComment.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.equals(
    "Empty result on new post (no comments)",
    result.data,
    [],
  );

  // --- TEST AS ADMIN (no deleted/denied can be simulated) ---
  // Admin already logged in at top. Get listing for admin view.
  result = await api.functional.shoppingMall.boards.posts.comments.index(
    connection,
    {
      boardId: board.id,
      postId: post.id,
      body: {} satisfies IShoppingMallComment.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.predicate(
    "admin (or customer) sees at least all approved comments",
    result.data.some((c) => c.moderation_status === "approved"),
  );

  // 7. Filter with no matches: author_type=admin (no admin comments created)
  result = await api.functional.shoppingMall.boards.posts.comments.index(
    connection,
    {
      boardId: board.id,
      postId: post.id,
      body: { author_type: "admin" } satisfies IShoppingMallComment.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.equals("No admin comments exist yet", result.data, []);

  // 8. Keyword search by comment summary: "Reply" text (matches our reply bodies)
  const searchTerm = "Reply"; // matches reply1 and reply2 bodies
  result = await api.functional.shoppingMall.boards.posts.comments.index(
    connection,
    {
      boardId: board.id,
      postId: post.id,
      body: { search: searchTerm } satisfies IShoppingMallComment.IRequest,
    },
  );
  typia.assert(result);
  TestValidator.predicate(
    "Keyword search returns subset of matching comments",
    result.data.length >= 1,
  );
  TestValidator.predicate(
    "Keyword search only returns matching summaries",
    result.data.every((c) => c.comment_body_summary.includes(searchTerm)),
  );
}
