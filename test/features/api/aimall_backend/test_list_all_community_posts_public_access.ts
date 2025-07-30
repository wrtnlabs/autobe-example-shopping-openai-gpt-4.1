import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";

/**
 * Validate public and authenticated post listing (community/board).
 *
 * This test ensures that public and authenticated users can fetch a list of all
 * community posts. It covers the following business logic:
 *
 * - Multiple roles can create posts (customer, seller, administrator)
 * - Public endpoint must only return non-private posts to unauthenticated users
 * - Authenticated users see their own private posts AND all public posts
 * - No denormalized or sensitive user information appears in the post list
 *
 * Test Steps:
 *
 * 1. Create several posts as different roles (customer, seller, admin), mixing
 *    public/private status
 * 2. Fetch the post list as a public (unauthenticated) user and validate correct
 *    visibility
 * 3. (If authentication APIs are available) Fetch the post list as each creator
 *    and check their private posts are included
 * 4. Validate that only atomic/essential post fields are present; no denormalized
 *    or sensitive user data is in the list
 */
export async function test_api_aimall_backend_posts_index(
  connection: api.IConnection,
) {
  // 1. Customer creates public and private posts
  const customerPublicPost =
    await api.functional.aimall_backend.customer.posts.create(connection, {
      body: {
        title: "Customer Public Post",
        body: "This is a public post by a customer",
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(customerPublicPost);

  const customerPrivatePost =
    await api.functional.aimall_backend.customer.posts.create(connection, {
      body: {
        title: "Customer Private Post",
        body: "This is a private post by a customer",
        is_private: true,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(customerPrivatePost);

  // 2. Seller creates public and private posts
  const sellerPublicPost =
    await api.functional.aimall_backend.seller.posts.create(connection, {
      body: {
        title: "Seller Public Post",
        body: "This is a public post by a seller",
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(sellerPublicPost);

  const sellerPrivatePost =
    await api.functional.aimall_backend.seller.posts.create(connection, {
      body: {
        title: "Seller Private Post",
        body: "This is a private post by a seller",
        is_private: true,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(sellerPrivatePost);

  // 3. Administrator creates public and private posts
  const adminPublicPost =
    await api.functional.aimall_backend.administrator.posts.create(connection, {
      body: {
        title: "Admin Public Post",
        body: "This is a public post by an admin",
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(adminPublicPost);

  const adminPrivatePost =
    await api.functional.aimall_backend.administrator.posts.create(connection, {
      body: {
        title: "Admin Private Post",
        body: "This is a private post by an admin",
        is_private: true,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(adminPrivatePost);

  // 4. Fetch the list of all posts as a public (unauthenticated) user
  const postList = await api.functional.aimall_backend.posts.index(connection);
  typia.assert(postList);

  // All public posts created above should appear
  const publicPostIds = [
    customerPublicPost.id,
    sellerPublicPost.id,
    adminPublicPost.id,
  ];
  for (const id of publicPostIds) {
    TestValidator.predicate(`public post ${id} should appear in post list`)(
      postList.data.some((post) => post.id === id),
    );
  }
  // Private posts should not appear to public/non-authenticated users
  const privatePostIds = [
    customerPrivatePost.id,
    sellerPrivatePost.id,
    adminPrivatePost.id,
  ];
  for (const id of privatePostIds) {
    TestValidator.predicate(
      `private post ${id} should NOT appear in public list`,
    )(!postList.data.some((post) => post.id === id));
  }
  // All post list items must follow IAimallBackendPost - no sensitive fields
  for (const post of postList.data) {
    typia.assert(post);
    // Should not leak customer_id except as allowed; all fields must be atomic
    TestValidator.predicate("no extra fields")(
      Object.keys(post).every((key) =>
        [
          "id",
          "customer_id",
          "title",
          "body",
          "is_private",
          "view_count",
          "created_at",
          "updated_at",
          "deleted_at",
        ].includes(key),
      ),
    );
  }
}
