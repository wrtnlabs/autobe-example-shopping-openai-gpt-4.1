import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCategory";
import type { IPageIAimallBackendCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendCategory";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test searching product categories via administrator API with filters and
 * pagination.
 *
 * This test validates the advanced search functionality for product taxonomy
 * management:
 *
 * - Ensures categories can be searched by keyword, parent_id, and depth, with
 *   correct pagination
 * - Verifies that only categories matching the filter are returned
 * - Checks that pagination metadata is accurate
 * - Confirms edge cases: no matches, invalid parameters, and (documented) role
 *   restriction
 *
 * Steps performed:
 *
 * 1. Setup: Create multiple categories as a seller (roots and subs, various names
 *    and depths)
 * 2. Search by name keyword: Admin requests category page filtered by keyword,
 *    expecting only exact matches
 * 3. Search by parent_id: Only categories under given parent returned
 * 4. Search by depth: Only categories at given hierarchy returned
 * 5. Edge: Search for nonexistent keyword returns empty results
 * 6. Error: Invalid pagination (e.g., negative page) yields error
 * 7. (Commented) Role restriction: Only allowed roles may access search
 */
export async function test_api_aimall_backend_administrator_categories_test_search_categories_with_pagination_and_keyword_filter(
  connection: api.IConnection,
) {
  // 1. Setup: create root and subcategories to exercise filter logic
  const rootCategory1 =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        name: "ElectronicsRoot",
        parent_id: null,
        depth: 1,
      } satisfies IAimallBackendCategory.ICreate,
    });
  typia.assert(rootCategory1);

  const rootCategory2 =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        name: "BooksRoot",
        parent_id: null,
        depth: 1,
      } satisfies IAimallBackendCategory.ICreate,
    });
  typia.assert(rootCategory2);

  const subCategory1 =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        name: "ElectronicsMobile",
        parent_id: rootCategory1.id,
        depth: 2,
      } satisfies IAimallBackendCategory.ICreate,
    });
  typia.assert(subCategory1);

  const subCategory2 =
    await api.functional.aimall_backend.seller.categories.create(connection, {
      body: {
        name: "BooksFiction",
        parent_id: rootCategory2.id,
        depth: 2,
      } satisfies IAimallBackendCategory.ICreate,
    });
  typia.assert(subCategory2);

  // 2. Search by name keyword (should yield only matching category)
  const searchByName =
    await api.functional.aimall_backend.administrator.categories.search(
      connection,
      {
        body: {
          name: "ElectronicsMobile",
          page: 1,
          limit: 10,
        } satisfies IAimallBackendCategory.IRequest,
      },
    );
  typia.assert(searchByName);
  TestValidator.predicate(
    "name keyword filter matches only relevant categories",
  )(searchByName.data.every((c) => c.name.includes("ElectronicsMobile")));
  TestValidator.equals("pagination - current page matches")(
    searchByName.pagination.current,
  )(1);
  TestValidator.equals("pagination - page size matches")(
    searchByName.pagination.limit,
  )(10);

  // 3. Search by parent_id: should yield only categories under BooksRoot
  const searchByParent =
    await api.functional.aimall_backend.administrator.categories.search(
      connection,
      {
        body: {
          parent_id: rootCategory2.id,
          page: 1,
          limit: 10,
        } satisfies IAimallBackendCategory.IRequest,
      },
    );
  typia.assert(searchByParent);
  TestValidator.predicate("parent_id filter matches only relevant categories")(
    searchByParent.data.every((c) => c.parent_id === rootCategory2.id),
  );

  // 4. Search by depth: should yield only subcategories (depth=2)
  const searchByDepth =
    await api.functional.aimall_backend.administrator.categories.search(
      connection,
      {
        body: {
          depth: 2,
          page: 1,
          limit: 10,
        } satisfies IAimallBackendCategory.IRequest,
      },
    );
  typia.assert(searchByDepth);
  TestValidator.predicate("depth filter matches only subcategories")(
    searchByDepth.data.every((c) => c.depth === 2),
  );

  // 5. Edge: keyword matches no categories
  const searchNoMatch =
    await api.functional.aimall_backend.administrator.categories.search(
      connection,
      {
        body: {
          name: "NonexistentCategory",
          page: 1,
          limit: 10,
        } satisfies IAimallBackendCategory.IRequest,
      },
    );
  typia.assert(searchNoMatch);
  TestValidator.equals("no result for unmatched keyword")(
    searchNoMatch.data.length,
  )(0);

  // 6. Edge: invalid parameter (negative page)
  await TestValidator.error("invalid pagination parameters cause error")(
    async () => {
      await api.functional.aimall_backend.administrator.categories.search(
        connection,
        {
          body: {
            page: -1,
            limit: 10,
          } satisfies IAimallBackendCategory.IRequest,
        },
      );
    },
  );

  // 7. Role restriction: Only administrators (and not general users) should have access. Not simulated here, but check for 403 on forbidden role if possible.
}
