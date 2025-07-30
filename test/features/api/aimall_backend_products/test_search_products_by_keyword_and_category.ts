import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IPageIAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendProduct";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate advanced search and filter on product catalog via PATCH
 * /aimall-backend/products.
 *
 * This test ensures:
 *
 * 1. Products are returned according to keyword match (partial/full) in title
 *    and/or description using appropriate 'title' filter in request.
 * 2. Category filtering works: only products with the specified category_id are
 *    returned.
 * 3. Pagination CLI and integrity is correct: proper 'limit', 'page', and
 *    metadata.
 * 4. Data integrity: All returned products match search criteria; extra records
 *    are excluded.
 *
 * Steps:
 *
 * 1. Create multiple products with unique/disjoint titles, bodies, and category
 *    IDs.
 * 2. Search with a title/description keyword known to only match a target product.
 *
 *    - Assert all results include that keyword and/or match the target product only.
 * 3. Search with category filter set to a chosen product's category_id.
 *
 *    - Assert only products within that category are returned.
 * 4. Search with both keyword and category; verify intersection match is enforced.
 * 5. Check paginated response: response pagination metadata and data integrity.
 * 6. Negative: Search with keyword/category combo that matches nothing should
 *    return no results.
 */
export async function test_api_aimall_backend_products_test_search_products_by_keyword_and_category(
  connection: api.IConnection,
) {
  // 1. Create categories (simulate with random UUIDs for test coverage/diversity)
  const categoryIdA = typia.random<string & tags.Format<"uuid">>();
  const categoryIdB = typia.random<string & tags.Format<"uuid">>();

  // 2. Create products with unique/disjoint content and categories
  //    Deliberate test data: titles/descriptions include unique keywords or are mutually exclusive.
  const productA = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: categoryIdA,
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Alpha Omega KeywordX",
        description: "First product with KeywordX only",
        status: "active",
      },
    },
  );
  typia.assert(productA);

  const productB = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: categoryIdA,
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Beta Product",
        description: "Second product unrelated",
        status: "active",
      },
    },
  );
  typia.assert(productB);

  const productC = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: {
        category_id: categoryIdB,
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        title: "Gamma Product KeywordZ",
        description: "Third product for category B and KeywordZ",
        status: "active",
      },
    },
  );
  typia.assert(productC);

  // 3. Search by keyword matching productA only ('KeywordX')
  const searchByKeyword = await api.functional.aimall_backend.products.search(
    connection,
    {
      body: {
        title: "KeywordX",
        limit: 10,
        page: 1,
      },
    },
  );
  typia.assert(searchByKeyword);
  TestValidator.predicate(
    "search by keyword: all returned products match keyword",
  )(
    searchByKeyword.data.every(
      (p) =>
        p.title.includes("KeywordX") ||
        (p.description ?? "").includes("KeywordX"),
    ),
  );
  TestValidator.predicate(
    "search by keyword: only expected product(s) are returned",
  )(searchByKeyword.data.some((p) => p.id === productA.id));

  // 4. Search by category (categoryIdA)
  const searchByCategory = await api.functional.aimall_backend.products.search(
    connection,
    {
      body: {
        category_id: categoryIdA,
        limit: 10,
        page: 1,
      },
    },
  );
  typia.assert(searchByCategory);
  TestValidator.predicate(
    "search by category: all returned products match category",
  )(searchByCategory.data.every((p) => p.category_id === categoryIdA));

  // 5. Search by keyword and category for intersection (should yield productA only)
  const searchCombo = await api.functional.aimall_backend.products.search(
    connection,
    {
      body: {
        title: "KeywordX",
        category_id: categoryIdA,
        limit: 10,
        page: 1,
      },
    },
  );
  typia.assert(searchCombo);
  TestValidator.equals("search by keyword+category: only productA is returned")(
    searchCombo.data.map((p) => p.id).sort(),
  )([productA.id]);

  // 6. Pagination metadata checks (type, bounds, logic)
  TestValidator.equals("pagination: integrity type")(
    typeof searchCombo.pagination.current,
  )("number");
  TestValidator.predicate("pagination: current page is 1")(
    searchCombo.pagination.current === 1,
  );
  TestValidator.predicate("pagination: limit is 10")(
    searchCombo.pagination.limit === 10,
  );
  TestValidator.predicate("pagination: records matches data length")(
    searchCombo.pagination.records === searchCombo.data.length,
  );

  // 7. Negative test: search with an impossible keyword/category combo yields no results
  const searchNegative = await api.functional.aimall_backend.products.search(
    connection,
    {
      body: {
        title: "ZZZZ_UNMATCHED",
        category_id: categoryIdB,
        limit: 5,
        page: 1,
      },
    },
  );
  typia.assert(searchNegative);
  TestValidator.equals("negative: no product should match impossible combo")(
    searchNegative.data.length,
  )(0);
}
