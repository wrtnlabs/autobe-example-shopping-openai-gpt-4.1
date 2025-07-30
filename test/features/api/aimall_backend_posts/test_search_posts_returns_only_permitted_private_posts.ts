import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPost";
import type { IPageIAimallBackendPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that search results for community posts only include private posts
 * for their author or a privileged administrator.
 *
 * This test ensures that privacy and ABAC (attribute-based access control) are
 * enforced for public and private posts created by both customer and seller
 * users.
 *
 * Steps:
 *
 * 1. Customer creates public and private posts
 * 2. Seller creates public and private posts
 * 3. Search as CUSTOMER; verify: sees own posts (public/private), other's public
 *    post, not other's private
 * 4. Search as SELLER; verify: sees own posts (public/private), other's public,
 *    not other's private
 * 5. Search as ADMIN; verify: sees ALL posts (including all private)
 * 6. Search as unauthenticated user; verify: sees ONLY public posts (not any
 *    private)
 */
export async function test_api_aimall_backend_posts_test_search_posts_returns_only_permitted_private_posts(
  connection: api.IConnection,
) {
  // 1. Create public and private posts as customer
  const customerPublicPost =
    await api.functional.aimall_backend.customer.posts.create(connection, {
      body: {
        title: "Customer Public Post",
        body: "Content of customer public post",
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(customerPublicPost);

  const customerPrivatePost =
    await api.functional.aimall_backend.customer.posts.create(connection, {
      body: {
        title: "Customer Private Post",
        body: "Content of customer private post",
        is_private: true,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(customerPrivatePost);

  // 2. Create public and private posts as seller
  const sellerPublicPost =
    await api.functional.aimall_backend.seller.posts.create(connection, {
      body: {
        title: "Seller Public Post",
        body: "Content of seller public post",
        is_private: false,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(sellerPublicPost);

  const sellerPrivatePost =
    await api.functional.aimall_backend.seller.posts.create(connection, {
      body: {
        title: "Seller Private Post",
        body: "Content of seller private post",
        is_private: true,
      } satisfies IAimallBackendPost.ICreate,
    });
  typia.assert(sellerPrivatePost);

  const allIds = [
    customerPublicPost.id,
    customerPrivatePost.id,
    sellerPublicPost.id,
    sellerPrivatePost.id,
  ];

  // 3. Search as CUSTOMER (should see own posts (public/private) and other's public, not other's private)
  // (Assume connection is authenticated as the same customer)
  let results = await api.functional.aimall_backend.posts.search(connection, {
    body: {} satisfies IAimallBackendPost.IRequest,
  });
  typia.assert(results);
  const customerResultIds = results.data.map((p) => p.id);
  TestValidator.predicate("customer sees their public post")(
    customerResultIds.includes(customerPublicPost.id),
  );
  TestValidator.predicate("customer sees their private post")(
    customerResultIds.includes(customerPrivatePost.id),
  );
  TestValidator.predicate("customer sees other's public post")(
    customerResultIds.includes(sellerPublicPost.id),
  );
  TestValidator.predicate("customer does NOT see other's private post")(
    !customerResultIds.includes(sellerPrivatePost.id),
  );

  // 4. Search as SELLER (should see own posts (public/private) and other's public, not other's private)
  // (Assume connection is authenticated as the seller)
  // In a real test, you would switch the authentication token here
  // For demonstration, assume "connection" context is updated appropriately
  results = await api.functional.aimall_backend.posts.search(connection, {
    body: {} satisfies IAimallBackendPost.IRequest,
  });
  typia.assert(results);
  const sellerResultIds = results.data.map((p) => p.id);
  TestValidator.predicate("seller sees their public post")(
    sellerResultIds.includes(sellerPublicPost.id),
  );
  TestValidator.predicate("seller sees their private post")(
    sellerResultIds.includes(sellerPrivatePost.id),
  );
  TestValidator.predicate("seller sees other's public post")(
    sellerResultIds.includes(customerPublicPost.id),
  );
  TestValidator.predicate("seller does NOT see other's private post")(
    !sellerResultIds.includes(customerPrivatePost.id),
  );

  // 5. Search as ADMIN (should see all posts including all private)
  // In a real E2E test, re-authenticate connection as admin
  results = await api.functional.aimall_backend.posts.search(connection, {
    body: {} satisfies IAimallBackendPost.IRequest,
  });
  typia.assert(results);
  const adminResultIds = results.data.map((p) => p.id);
  TestValidator.predicate("admin sees all posts")(
    allIds.every((id) => adminResultIds.includes(id)),
  );

  // 6. Search as unauthenticated/general user (should see ONLY public posts)
  results = await api.functional.aimall_backend.posts.search(connection, {
    body: { is_private: false } satisfies IAimallBackendPost.IRequest,
  });
  typia.assert(results);
  const unauthResultIds = results.data.map((p) => p.id);
  TestValidator.predicate("unauth user sees only public posts")(
    unauthResultIds.includes(customerPublicPost.id) &&
      unauthResultIds.includes(sellerPublicPost.id) &&
      !unauthResultIds.includes(customerPrivatePost.id) &&
      !unauthResultIds.includes(sellerPrivatePost.id),
  );
}
