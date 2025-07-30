import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced search and filtering of post snapshots by a customer.
 *
 * This test ensures that after uploading multiple snapshots (with different
 * attributes, such as captions and timestamps) under a single post, the
 * advanced search API for snapshots (PATCH
 * /aimall-backend/customer/posts/{postId}/snapshots) correctly returns matching
 * snapshot records according to given filters (such as media URI substring or
 * created_at date range), and fulfills expected behaviors for no results.
 *
 * Test workflow:
 *
 * 1. Create a customer post (as the parent entity for snapshots)
 * 2. Upload several snapshots with varied properties (media_uri, caption, distinct
 *    created_at values for meaningful filtering)
 * 3. Search/filter snapshots using known criteria:
 *
 *    - By post_id only (should return all snapshots)
 *    - By media_uri substring (should match a subset)
 *    - By created_from/created_to date range
 *    - By caption keyword
 *    - By impossible filter (should return an empty result)
 * 4. In each case, validate that results match expected filtering, including total
 *    count and correct field content.
 */
export async function test_api_aimall_backend_customer_posts_snapshots_test_advanced_search_snapshots_for_post_by_customer(
  connection: api.IConnection,
) {
  // 1. Create a new post
  const post = await api.functional.aimall_backend.customer.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(1),
        body: RandomGenerator.content()()(),
        is_private: false,
      },
    },
  );
  typia.assert(post);

  // 2. Upload several snapshots with distinct properties (media_uri, caption, created_at)
  const snapshots: IAimallBackendSnapshot[] = [];
  const now = new Date();
  for (let i = 0; i < 3; ++i) {
    // Spread out created_at, alternate media_uri patterns, mix captions
    const created_at = new Date(now.getTime() + i * 86400000).toISOString();
    const media_uri =
      i % 2 === 0
        ? `https://media.example.com/photo${i}.jpg`
        : `https://media.example.com/video${i}.mp4`;
    const caption = i === 1 ? "holiday-trip" : `test-caption-${i}`;
    const snap =
      await api.functional.aimall_backend.customer.posts.snapshots.create(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            media_uri,
            caption,
            created_at,
          },
        },
      );
    typia.assert(snap);
    snapshots.push(snap);
  }

  // 3. Search by post_id only: should return all 3
  {
    const res =
      await api.functional.aimall_backend.customer.posts.snapshots.search(
        connection,
        {
          postId: post.id,
          body: { post_id: post.id },
        },
      );
    typia.assert(res);
    TestValidator.equals("all snapshots exist")(res.data?.length ?? 0)(
      snapshots.length,
    );
  }

  // 4. Search by media_uri substring: should match 1 or more
  {
    const filterUri = "video";
    const expected = snapshots.filter((s) => s.media_uri.includes(filterUri));
    const res =
      await api.functional.aimall_backend.customer.posts.snapshots.search(
        connection,
        {
          postId: post.id,
          body: { post_id: post.id, media_uri: filterUri },
        },
      );
    typia.assert(res);
    TestValidator.equals("filtered by media_uri")(res.data?.length ?? 0)(
      expected.length,
    );
    TestValidator.predicate("all returned should match media_uri filter")(
      res.data?.every((s) => s.media_uri.includes(filterUri)) ?? false,
    );
  }

  // 5. Search by caption substring (should match at least one)
  {
    const filterCaption = "holiday";
    const expected = snapshots.filter((s) =>
      (s.caption ?? "").includes(filterCaption),
    );
    const res =
      await api.functional.aimall_backend.customer.posts.snapshots.search(
        connection,
        {
          postId: post.id,
          body: { post_id: post.id, caption: filterCaption },
        },
      );
    typia.assert(res);
    TestValidator.equals("filter by caption substring")(res.data?.length ?? 0)(
      expected.length,
    );
    TestValidator.predicate("all returned captions should match filter")(
      res.data?.every((s) => (s.caption ?? "").includes(filterCaption)) ??
        false,
    );
  }

  // 6. Search by created_from: should match only those created after a certain date
  {
    const from = new Date(now.getTime() + 86400000).toISOString();
    const expected = snapshots.filter((s) => s.created_at >= from);
    const res =
      await api.functional.aimall_backend.customer.posts.snapshots.search(
        connection,
        {
          postId: post.id,
          body: { post_id: post.id, created_from: from },
        },
      );
    typia.assert(res);
    TestValidator.equals("filter by created_from")(res.data?.length ?? 0)(
      expected.length,
    );
    TestValidator.predicate("returned created_at >= searchFrom")(
      res.data?.every((s) => s.created_at >= from) ?? false,
    );
  }

  // 7. Search by created_to: should match only those created on/before certain date
  {
    const to = new Date(now.getTime()).toISOString();
    const expected = snapshots.filter((s) => s.created_at <= to);
    const res =
      await api.functional.aimall_backend.customer.posts.snapshots.search(
        connection,
        {
          postId: post.id,
          body: { post_id: post.id, created_to: to },
        },
      );
    typia.assert(res);
    TestValidator.equals("filter by created_to")(res.data?.length ?? 0)(
      expected.length,
    );
    TestValidator.predicate("all returned created_at <= to date")(
      res.data?.every((s) => s.created_at <= to) ?? false,
    );
  }

  // 8. Impossible filter: should return zero results
  {
    const res =
      await api.functional.aimall_backend.customer.posts.snapshots.search(
        connection,
        {
          postId: post.id,
          body: { post_id: post.id, caption: "unmatchable-filter-string-zzz" },
        },
      );
    typia.assert(res);
    TestValidator.equals("empty results for unmatchable filter")(
      res.data?.length ?? 0,
    )(0);
  }
}
