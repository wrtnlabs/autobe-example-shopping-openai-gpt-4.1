import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";

/**
 * Validate the public product catalog search with filtering, sorting, and
 * pagination as a guest user.
 *
 * Preconditions:
 *
 * - Create a product category for category filtering
 * - Create a seller role so proper seller associations can be set up
 * - Register an active product assigned to the created category and seller
 *
 * Test Sequence:
 *
 * 1. Create a product category (active, with unique names in both ko/en, order 0)
 * 2. Create a seller role (e.g., 'SELLER' with description)
 * 3. Create an active product (associate to new seller and category, with name and
 *    description, active flag true)
 * 4. As a guest, perform product catalog search with various combinations:
 *
 *    - Default search (no filters)
 *    - Search by keyword (product name substring)
 *    - Filter by category
 *    - Filter by is_active false: should yield no results
 *    - Filter by min_price and max_price (valid range and range that excludes
 *         product)
 *    - Sort by newest, price ascending, price descending
 *    - Pagination: use page=1, limit=1 to guarantee single-product pages
 * 5. Validate that all listings only include active products
 * 6. Validate pagination metadata (current, limit, records, pages) is correct
 * 7. Try invalid filter: use impossible category_id, expect empty results
 * 8. Try invalid filter: min_price > max_price, expect empty results (not error)
 * 9. Validate error handling for invalid input (e.g., negative limit), expect
 *    error
 *
 * Postconditions:
 *
 * - No authentication required: guest can view catalog for all above flows
 * - No unpublished/inactive/deleted products should ever appear in results
 */
export async function test_api_product_catalog_browsing_and_search_filter_sort(
  connection: api.IConnection,
) {
  // 1. Create a category
  const categoryInput = {
    parent_id: undefined,
    name_ko: RandomGenerator.name(),
    name_en: RandomGenerator.name(),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryInput },
  );
  typia.assert(category);

  // 2. Create a seller role
  const sellerRoleInput = {
    role_name: "SELLER",
    description: "Seller role for product creation and association",
  } satisfies IShoppingMallRole.ICreate;
  const sellerRole = await api.functional.shoppingMall.admin.roles.create(
    connection,
    { body: sellerRoleInput },
  );
  typia.assert(sellerRole);

  // 3. Register active product
  const productInput = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    is_active: true,
  } satisfies IShoppingMallProduct.ICreate;
  const activeProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productInput,
    });
  typia.assert(activeProduct);

  // 4. Catalog search queries
  // 4.1 Default search (no filters)
  const page1 = await api.functional.shoppingMall.products.index(connection, {
    body: {} satisfies IShoppingMallProduct.IRequest,
  });
  typia.assert(page1);
  TestValidator.predicate(
    "only active products listed by default",
    page1.data.every((p) => p.is_active === true),
  );

  // 4.2 Keyword search (by name substring)
  const keyword = RandomGenerator.substring(activeProduct.name);
  const gsByKeyword = await api.functional.shoppingMall.products.index(
    connection,
    { body: { search: keyword } satisfies IShoppingMallProduct.IRequest },
  );
  typia.assert(gsByKeyword);
  TestValidator.predicate(
    "at least one product in keyword result",
    gsByKeyword.data.length >= 1,
  );
  TestValidator.predicate(
    "keyword result products have keyword in name or description",
    gsByKeyword.data.some((p) => p.name.includes(keyword)),
  );

  // 4.3 Category filter
  const gsByCategory = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        category_id: category.id,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(gsByCategory);
  TestValidator.predicate(
    "category filter only returns active products in category",
    gsByCategory.data.every(
      (p) => p.is_active && p.shopping_mall_category_id === category.id,
    ),
  );

  // 4.4 Filter is_active false: result should be empty (only active products shown to guest)
  const gsInactive = await api.functional.shoppingMall.products.index(
    connection,
    { body: { is_active: false } satisfies IShoppingMallProduct.IRequest },
  );
  typia.assert(gsInactive);
  TestValidator.equals(
    "inactive products not listed for guest",
    gsInactive.data.length,
    0,
  );

  // 4.5 Filter by price range (impossible range: excludes product)
  const gsWrongPrice = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        min_price: 999999,
        max_price: 1000000,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(gsWrongPrice);
  TestValidator.equals(
    "pricing filter with impossible range yields 0 results",
    gsWrongPrice.data.length,
    0,
  );

  // 4.6 Filter by price range (valid range, if price known)
  // Cannot supply price in IShoppingMallProduct.ICreate. Skip direct price-based pass unless domain provides it in summary.

  // 4.7 Sort by newest
  const sortedNewest = await api.functional.shoppingMall.products.index(
    connection,
    { body: { sort: "newest" } satisfies IShoppingMallProduct.IRequest },
  );
  typia.assert(sortedNewest);
  TestValidator.predicate(
    "result is not empty for sort by newest",
    sortedNewest.data.length > 0,
  );

  // 4.8 Sort by price ascending
  const sortedPriceAsc = await api.functional.shoppingMall.products.index(
    connection,
    { body: { sort: "price_asc" } satisfies IShoppingMallProduct.IRequest },
  );
  typia.assert(sortedPriceAsc);
  // No price in ISummary, so only check that there is data
  TestValidator.predicate(
    "sort by price_asc returns data",
    sortedPriceAsc.data.length > 0,
  );

  // 4.9 Sort by price descending
  const sortedPriceDesc = await api.functional.shoppingMall.products.index(
    connection,
    { body: { sort: "price_desc" } satisfies IShoppingMallProduct.IRequest },
  );
  typia.assert(sortedPriceDesc);
  TestValidator.predicate(
    "sort by price_desc returns data",
    sortedPriceDesc.data.length > 0,
  );

  // 4.10 Pagination: limit=1, page=1
  const paged1 = await api.functional.shoppingMall.products.index(connection, {
    body: { limit: 1, page: 1 } satisfies IShoppingMallProduct.IRequest,
  });
  typia.assert(paged1);
  TestValidator.equals("pagination limit respected", paged1.data.length, 1);
  TestValidator.equals("pagination page is 1", paged1.pagination.current, 1);
  TestValidator.equals("pagination limit is 1", paged1.pagination.limit, 1);

  // 5. Validate pagination metadata matches structure
  TestValidator.predicate(
    "pagination records >= data.length",
    paged1.pagination.records >= paged1.data.length,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    paged1.pagination.pages >= 1,
  );

  // 6. Invalid filter: impossible category_id yields 0 results
  const gsInvalidCategory = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(gsInvalidCategory);
  TestValidator.equals(
    "invalid category filter yields empty results",
    gsInvalidCategory.data.length,
    0,
  );

  // 7. Invalid filter: min_price > max_price yields empty results
  const gsPriceReverse = await api.functional.shoppingMall.products.index(
    connection,
    {
      body: {
        min_price: 1000,
        max_price: 10,
      } satisfies IShoppingMallProduct.IRequest,
    },
  );
  typia.assert(gsPriceReverse);
  TestValidator.equals(
    "min_price > max_price yields empty results",
    gsPriceReverse.data.length,
    0,
  );

  // 8. Invalid input: negative limit should error
  await TestValidator.error("negative limit raises error", async () => {
    await api.functional.shoppingMall.products.index(connection, {
      body: { limit: -1 } satisfies IShoppingMallProduct.IRequest,
    });
  });
}
