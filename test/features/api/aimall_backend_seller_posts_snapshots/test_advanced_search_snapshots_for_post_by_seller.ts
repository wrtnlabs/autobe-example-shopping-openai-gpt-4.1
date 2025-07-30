import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate seller's advanced filtered search for snapshots using PATCH
 * endpoint.
 *
 * This test validates the ability to upload multiple snapshots to a seller's
 * post, then perform advanced searches (filters, pagination) on that set with
 * PATCH. Snapshots will have varying attributes (caption, media_uri), and
 * search filters will target these differences. Both success and edge/failure
 * scenarios (e.g., no match, pagination limits) are validated.
 *
 * Steps:
 *
 * 1. Create a post as a seller
 * 2. Upload at least three distinct snapshots to this post
 *
 *    - Distinct captions, media URIs
 * 3. Filter by unique caption: only the targeted snapshot is returned
 * 4. Filter by non-existent caption: should return empty result
 * 5. Test pagination (limit=2): verify split between pages, total matches uploaded
 * 6. Filter by shared caption: ensure multiple correct matches are returned
 */
export async function test_api_aimall_backend_seller_posts_snapshots_test_advanced_search_snapshots_for_post_by_seller(
  connection: api.IConnection,
) {
  // 1. Seller creates a post
  const post = await api.functional.aimall_backend.seller.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph()(2),
        body: RandomGenerator.content()()(),
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    },
  );
  typia.assert(post);

  // 2. Upload three snapshots with varying captions and media URIs
  const snapshots: IAimallBackendSnapshot[] = [];
  const captions = [
    RandomGenerator.alphaNumeric(8),
    RandomGenerator.alphaNumeric(8),
    RandomGenerator.alphaNumeric(8),
  ];
  const uris = [
    "https://example.com/imageA.png",
    "https://example.com/imageB.jpg",
    "https://example.com/videoC.mp4",
  ];
  for (let i = 0; i < 3; ++i) {
    const snapshot =
      await api.functional.aimall_backend.seller.posts.snapshots.create(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            media_uri: uris[i],
            caption: captions[i],
            created_at: new Date(Date.now() - i * 1000 * 60).toISOString(),
          } satisfies IAimallBackendSnapshot.ICreate,
        },
      );
    typia.assert(snapshot);
    snapshots.push(snapshot);
  }

  // 3. Search by caption for the second snapshot, only that one should be returned
  const filterCaption = captions[1];
  const captionSearch =
    await api.functional.aimall_backend.seller.posts.snapshots.search(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          caption: filterCaption,
          limit: 10,
          page: 1,
        } satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  typia.assert(captionSearch);
  TestValidator.equals("Only snapshot with filter caption should return")(
    captionSearch.data?.length,
  )(1);
  TestValidator.equals("Returned caption matches filter")(
    captionSearch.data?.[0]?.caption,
  )(filterCaption);

  // 4. Search by a non-existent caption, expect empty results
  const emptyCaption = "not-a-real-caption-zzz";
  const emptySearch =
    await api.functional.aimall_backend.seller.posts.snapshots.search(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          caption: emptyCaption,
          limit: 10,
          page: 1,
        } satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals("No results for absent caption")(
    emptySearch.data?.length ?? 0,
  )(0);

  // 5a. Pagination test, limit=2, page=1
  const page1 =
    await api.functional.aimall_backend.seller.posts.snapshots.search(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          limit: 2,
          page: 1,
        } satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("First page should return 2 items")(page1.data?.length)(
    2,
  );

  // 5b. Pagination test, limit=2, page=2
  const page2 =
    await api.functional.aimall_backend.seller.posts.snapshots.search(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          limit: 2,
          page: 2,
        } satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("Second page should return 1 item")(page2.data?.length)(
    1,
  );
  // 5c. Total returned should match uploaded snapshots
  const totalReturned = (page1.data?.length ?? 0) + (page2.data?.length ?? 0);
  TestValidator.equals("Total paginated matches uploaded count")(totalReturned)(
    snapshots.length,
  );

  // 6. Add an extra snapshot with same caption as the first
  const sharedCaption = captions[0];
  const extra =
    await api.functional.aimall_backend.seller.posts.snapshots.create(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          media_uri: "https://example.com/extraD.jpg",
          caption: sharedCaption,
        } satisfies IAimallBackendSnapshot.ICreate,
      },
    );
  typia.assert(extra);

  const sharedSearch =
    await api.functional.aimall_backend.seller.posts.snapshots.search(
      connection,
      {
        postId: post.id,
        body: {
          post_id: post.id,
          caption: sharedCaption,
          limit: 10,
          page: 1,
        } satisfies IAimallBackendSnapshot.IRequest,
      },
    );
  typia.assert(sharedSearch);
  TestValidator.predicate("Filtering by shared caption returns >=2 items")(
    (sharedSearch.data?.length ?? 0) >= 2,
  );
}
