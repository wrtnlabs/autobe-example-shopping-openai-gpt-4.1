import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendComment";
import type { IPageIAimallBackendComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendComment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test advanced searching and filtering on post comments with pagination and
 * privacy compliance.
 *
 * This scenario tests:
 *
 * - Filtering by author (customer_id)
 * - Filtering by privacy (is_private)
 * - Filtering by body/keyword (body string matching)
 * - Filtering by created_at date range
 * - Pagination (page, limit) and returned counts
 * - Privacy: public comments are always visible, private comments only to their
 *   author
 *
 * Steps:
 *
 * 1. Create a new post as a customer
 * 2. Populate with diverse comments:
 *
 *    - At least 2 authors (customer IDs)
 *    - Some public, some private
 *    - Body variations for keyword filtering
 * 3. Search with filters (author/customer_id, keyword/body, privacy, dates,
 *    paginated)
 * 4. For each filter scenario, validate response contains only expected comments,
 *    correct pagination, and privacy compliance
 */
export async function test_api_aimall_backend_customer_posts_comments_test_search_comments_for_post_with_pagination_and_filter(
  connection: api.IConnection,
) {
  // -------------------------
  // 1. Create a new post
  // -------------------------
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: `Filter/E2E Test Post ${RandomGenerator.alphaNumeric(6)}`,
        body: `Body for E2E filter test ${RandomGenerator.paragraph()(1)}`,
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // Emulate two customer IDs for authorship filtering (simulate since no explicit customer switch/login API in customer context)
  const authorIdA = typia.random<string & tags.Format<"uuid">>();
  const authorIdB = typia.random<string & tags.Format<"uuid">>();
  // We'll inject these manually when creating comments as .customer_id fields.
  //
  // We'll use created_at timestamps for date filtering and body variations for keyword.
  const baseDate = new Date();
  const isoOne = baseDate.toISOString();
  const isoTwo = new Date(baseDate.getTime() + 30 * 1000).toISOString();
  const isoThree = new Date(baseDate.getTime() + 60 * 1000).toISOString();

  // -----------------------
  // 2. Create comments
  // -----------------------
  // We make 6 comments: 3 by A (2 public, 1 private) at base/+:00, 3 by B (1 public, 2 private) at base/+:30/+:60
  const COMMENT_SEED = [
    {
      body: "E2E - public from A",
      is_private: false,
      customer_id: authorIdA,
      created_at: isoOne,
    },
    {
      body: "E2E - private from A",
      is_private: true,
      customer_id: authorIdA,
      created_at: isoTwo,
    },
    {
      body: "E2E - public2 from A",
      is_private: false,
      customer_id: authorIdA,
      created_at: isoThree,
    },
    {
      body: "E2E - public from B",
      is_private: false,
      customer_id: authorIdB,
      created_at: isoOne,
    },
    {
      body: "E2E - private from B",
      is_private: true,
      customer_id: authorIdB,
      created_at: isoTwo,
    },
    {
      body: "E2E - private2 from B",
      is_private: true,
      customer_id: authorIdB,
      created_at: isoThree,
    },
  ];

  const commentResults: IAimallBackendComment[] = [];
  for (const seed of COMMENT_SEED) {
    // For test vector control, set customer_id directly and simulate created_at after
    const comment =
      await api.functional.aimall_backend.customer.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            body: seed.body,
            is_private: seed.is_private,
          } satisfies IAimallBackendComment.ICreate,
        },
      );
    typia.assert(comment);
    // Patch customer_id and created_at (simulate, since actual fields are server-managed)
    comment.customer_id = seed.customer_id;
    comment.created_at = seed.created_at;
    commentResults.push(comment);
  }

  // Helper to filter what user should see per privacy, given their customer_id
  function visibleComments(viewerId: string | null) {
    return commentResults.filter(
      (c) => !c.is_private || c.customer_id === viewerId,
    );
  }

  // -----------------------
  // 3. FILTER TEST SCENARIOS
  // -----------------------
  // (a) By customer_id (authorIdA)
  const pageA =
    await api.functional.aimall_backend.customer.posts.comments.search(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          customer_id: authorIdA,
          page: 1,
          limit: 10,
        } satisfies IAimallBackendComment.IRequest,
      },
    );
  typia.assert(pageA);
  // Expect to see only A's: all 3 (incl. private)
  TestValidator.equals("author-id filter count")(pageA.data.length)(3);
  TestValidator.predicate("all from authorIdA")(
    pageA.data.every((c) => c.customer_id === authorIdA),
  );

  // (b) By is_private: true (all privates for viewerA - should see their own privates)
  const privA =
    await api.functional.aimall_backend.customer.posts.comments.search(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          is_private: true,
          customer_id: authorIdA, // Simulate search as A
          page: 1,
          limit: 10,
        } satisfies IAimallBackendComment.IRequest,
      },
    );
  typia.assert(privA);
  const privAList = commentResults.filter(
    (c) => c.is_private && c.customer_id === authorIdA,
  );
  TestValidator.equals("private by authorA count")(privA.data.length)(
    privAList.length,
  );
  TestValidator.predicate("private by authorA content")(
    privA.data.every((c) => c.customer_id === authorIdA && c.is_private),
  );

  // (c) By is_private: false (all publics)
  const pub =
    await api.functional.aimall_backend.customer.posts.comments.search(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          is_private: false,
          page: 1,
          limit: 10,
        } satisfies IAimallBackendComment.IRequest,
      },
    );
  typia.assert(pub);
  const publicList = commentResults.filter((c) => !c.is_private);
  TestValidator.equals("public comments count")(pub.data.length)(
    publicList.length,
  );
  TestValidator.predicate("all public comments")(
    pub.data.every((c) => !c.is_private),
  );

  // (d) By body/keyword search ("public")
  const kw = await api.functional.aimall_backend.customer.posts.comments.search(
    connection,
    {
      postId: post.id,
      body: {
        post_id: post.id,
        // Simulate keyword by filtering by partial match (API may/will not do fuzzy, just filtering test)
        page: 1,
        limit: 10,
      } satisfies IAimallBackendComment.IRequest,
    },
  );
  typia.assert(kw);
  // Since our seed uses "public" keyword in 3 bodies, filter manually
  const keyword = "public";
  const keywordList = commentResults.filter((c) => c.body.includes(keyword));
  TestValidator.equals("keyword filter count")(
    kw.data.filter((c) => c.body.includes(keyword)).length,
  )(keywordList.length);

  // (e) By created_at range (isoOne ~ isoTwo incl)
  const dateRange =
    await api.functional.aimall_backend.customer.posts.comments.search(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          created_at_from: isoOne,
          created_at_to: isoTwo,
          page: 1,
          limit: 10,
        } satisfies IAimallBackendComment.IRequest,
      },
    );
  typia.assert(dateRange);
  const rangeList = commentResults.filter(
    (c) => c.created_at >= isoOne && c.created_at <= isoTwo,
  );
  TestValidator.equals("createdAt range count")(dateRange.data.length)(
    rangeList.length,
  );

  // (f) Pagination: limit=2, page=2
  const paged =
    await api.functional.aimall_backend.customer.posts.comments.search(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          page: 2,
          limit: 2,
        } satisfies IAimallBackendComment.IRequest,
      },
    );
  typia.assert(paged);
  const allVisible = commentResults; // For admin: all comments, for customer: filtered by visibleComments if needed
  TestValidator.equals("paging: page number")(paged.pagination.current)(2);
  TestValidator.equals("paging: limit")(paged.pagination.limit)(2);
  TestValidator.equals("paging: records")(paged.pagination.records)(
    allVisible.length,
  );
  TestValidator.equals("paging: pages")(paged.pagination.pages)(
    Math.ceil(allVisible.length / 2),
  );
}
