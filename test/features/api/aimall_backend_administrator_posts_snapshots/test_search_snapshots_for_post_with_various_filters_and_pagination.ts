import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSnapshot";
import type { IPageIAimallBackendSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced paginated and filtered snapshot search for admin post
 * snapshots.
 *
 * Business context:
 *
 * - Verify that an administrator can perform complex filtered and paginated
 *   searches on snapshots (image/video/media resources) attached to a community
 *   post.
 * - Business rules include filtering by media format (image/video via URI
 *   extension), date range, and uploading user.
 * - Ensure results match filter, pagination metadata is correct, and only
 *   accessible to admins.
 *
 * Step-by-step process:
 *
 * 1. Create sample post as administrator
 * 2. Attach snapshots with different media_uri endings, created_at, and
 *    customer_ids
 * 3. PATCH search: various filter and pagination scenarios
 * 4. Assert results match the filter/pagination
 * 5. Attempt as non-admin (if possible), expect error
 */
export async function test_api_aimall_backend_administrator_posts_snapshots_test_search_snapshots_for_post_with_various_filters_and_pagination(
  connection: api.IConnection,
) {
  // 1. Create a sample post as administrator
  const post = await api.functional.aimall_backend.administrator.posts.create(
    connection,
    {
      body: {
        title: "Admin Post - Snapshot Search Test",
        body: "Testing advanced filtered and paginated search on snapshots by admin",
        is_private: false,
      },
    },
  );
  typia.assert(post);

  // 2. Attach snapshots with different media_uri endings, created_at timestamps, and customer_ids
  const userA = typia.random<string & tags.Format<"uuid">>();
  const userB = typia.random<string & tags.Format<"uuid">>();
  const baseDate = new Date();

  const snapshotsToCreate = [
    // Image (jpg) by userA
    {
      media_uri: "https://static.example.com/media/imgA1.jpg",
      created_at: new Date(baseDate.getTime() - 3600 * 1000 * 24).toISOString(), // 1 day ago
      customer_id: userA,
      caption: "UserA image jpg",
    },
    // Image (png) by userA
    {
      media_uri: "https://static.example.com/media/imgA2.png",
      created_at: new Date(baseDate.getTime() - 3600 * 1000 * 8).toISOString(), // 8 hours ago
      customer_id: userA,
      caption: "UserA image png",
    },
    // Video (mp4) by userB
    {
      media_uri: "https://static.example.com/media/vidB1.mp4",
      created_at: new Date(baseDate.getTime() - 3600 * 1000 * 40).toISOString(), // ~2 days ago
      customer_id: userB,
      caption: "UserB video mp4",
    },
    // Image (jpg) by userB
    {
      media_uri: "https://static.example.com/media/imgB2.jpg",
      created_at: new Date(baseDate.getTime() - 3600 * 1000 * 2).toISOString(), // 2 hours ago
      customer_id: userB,
      caption: "UserB image jpg",
    },
    // Video (mp4) by userA
    {
      media_uri: "https://static.example.com/media/vidA3.mp4",
      created_at: baseDate.toISOString(), // now
      customer_id: userA,
      caption: "UserA video mp4",
    },
  ];

  const createdSnapshots: IAimallBackendSnapshot[] = [];
  for (const snap of snapshotsToCreate) {
    const created =
      await api.functional.aimall_backend.administrator.posts.snapshots.create(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            customer_id: snap.customer_id,
            media_uri: snap.media_uri,
            caption: snap.caption,
            created_at: snap.created_at,
          },
        },
      );
    typia.assert(created);
    createdSnapshots.push(created);
  }

  // Helper: filter records by extension
  const filterByExtension = (
    snapshots: IAimallBackendSnapshot[],
    ext: string,
  ): IAimallBackendSnapshot[] =>
    snapshots.filter(
      (s: IAimallBackendSnapshot) => s.media_uri && s.media_uri.endsWith(ext),
    );
  // Helper: filter records by customer_id
  const filterByCustomer = (
    snapshots: IAimallBackendSnapshot[],
    customer_id: string,
  ): IAimallBackendSnapshot[] =>
    snapshots.filter(
      (s: IAimallBackendSnapshot) => s.customer_id === customer_id,
    );
  // Helper: filter records by date range
  const filterByDate = (
    snapshots: IAimallBackendSnapshot[],
    from: Date,
    to: Date,
  ): IAimallBackendSnapshot[] =>
    snapshots.filter((s: IAimallBackendSnapshot) => {
      const t = new Date(s.created_at).getTime();
      return t >= from.getTime() && t <= to.getTime();
    });

  // 3. PATCH search: Various scenarios
  // a) Filter by image .jpg extension
  {
    const filterExt = ".jpg";
    const output =
      await api.functional.aimall_backend.administrator.posts.snapshots.search(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
          },
        },
      );
    typia.assert(output);
    const expected = filterByExtension(createdSnapshots, filterExt);
    const received = (output.data ?? []).filter(
      (s: IAimallBackendSnapshot) =>
        s.media_uri && s.media_uri.endsWith(filterExt),
    );
    TestValidator.equals("jpg only count")(received.length)(expected.length);
    for (const s of received) {
      if (!s.media_uri.endsWith(filterExt))
        throw new Error("media_uri does not end with .jpg");
    }
  }
  // b) Filter by mp4 extension (video)
  {
    const filterExt = ".mp4";
    const output =
      await api.functional.aimall_backend.administrator.posts.snapshots.search(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
          },
        },
      );
    typia.assert(output);
    const expected = filterByExtension(createdSnapshots, filterExt);
    const received = (output.data ?? []).filter(
      (s: IAimallBackendSnapshot) =>
        s.media_uri && s.media_uri.endsWith(filterExt),
    );
    TestValidator.equals("mp4 only count")(received.length)(expected.length);
    for (const s of received) {
      if (!s.media_uri.endsWith(filterExt))
        throw new Error("media_uri does not end with .mp4");
    }
  }
  // c) Filter by customer_id (userA)
  {
    const output =
      await api.functional.aimall_backend.administrator.posts.snapshots.search(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            customer_id: userA,
          },
        },
      );
    typia.assert(output);
    const expected = filterByCustomer(createdSnapshots, userA);
    const received = (output.data ?? []).filter(
      (s: IAimallBackendSnapshot) => s.customer_id === userA,
    );
    TestValidator.equals("customer_id userA count")(received.length)(
      expected.length,
    );
    for (const s of received) {
      if (s.customer_id !== userA) throw new Error("customer_id mismatch");
    }
  }
  // d) Filter by date range
  {
    const from = new Date(baseDate.getTime() - 3600 * 1000 * 10); // 10 hours ago
    const to = new Date();
    const output =
      await api.functional.aimall_backend.administrator.posts.snapshots.search(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            created_from: from.toISOString(),
            created_to: to.toISOString(),
          },
        },
      );
    typia.assert(output);
    const expected = filterByDate(createdSnapshots, from, to);
    const received = (output.data ?? []).filter((s: IAimallBackendSnapshot) => {
      const t = new Date(s.created_at).getTime();
      return t >= from.getTime() && t <= to.getTime();
    });
    TestValidator.equals("date range count")(received.length)(expected.length);
  }
  // e) Pagination test: limit=2, page=1 and page=2
  {
    const limit = 2;
    // Page 1
    const out1 =
      await api.functional.aimall_backend.administrator.posts.snapshots.search(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            page: 1,
            limit: limit,
          },
        },
      );
    typia.assert(out1);
    TestValidator.equals("pagination 1st page count")((out1.data ?? []).length)(
      Math.min(limit, createdSnapshots.length),
    );
    TestValidator.equals("pagination current page")(out1.pagination?.current)(
      1,
    );
    TestValidator.equals("pagination per page")(out1.pagination?.limit)(limit);

    // Page 2
    const out2 =
      await api.functional.aimall_backend.administrator.posts.snapshots.search(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            page: 2,
            limit: limit,
          },
        },
      );
    typia.assert(out2);
    const expectedCount = Math.max(
      Math.min(limit, createdSnapshots.length - limit),
      0,
    );
    TestValidator.equals("pagination 2nd page count")((out2.data ?? []).length)(
      expectedCount,
    );
    TestValidator.equals("pagination current page")(out2.pagination?.current)(
      2,
    );
    TestValidator.equals("pagination per page")(out2.pagination?.limit)(limit);
  }
  // f) Query with impossible filter (e.g., caption = very random string)
  {
    const output =
      await api.functional.aimall_backend.administrator.posts.snapshots.search(
        connection,
        {
          postId: post.id,
          body: {
            post_id: post.id,
            caption: "__NO_SUCH_CAPTION_EXISTING__",
          },
        },
      );
    typia.assert(output);
    TestValidator.equals("empty filter result")((output.data ?? []).length)(0);
    TestValidator.equals("empty filter records")(
      output.pagination?.records ?? 0,
    )(0);
  }
  // 5. Attempt search as non-admin (if possible), expect error - actual non-admin role switching is not possible here
  // If API provided, would do: re-auth as a customer/non-admin, then attempt and expect error/denied
}
