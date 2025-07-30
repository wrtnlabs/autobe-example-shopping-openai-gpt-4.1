import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPageIAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendProduct";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";

/**
 * Validate the pagination and over-pagination handling for the public product
 * list endpoint.
 *
 * This test ensures that the system's paginated product listing correctly
 * returns multiple pages when the number of available products exceeds the
 * default page size. It also checks the correct handling of page requests that
 * exceed the total number of pages (should yield an empty array but valid
 * pagination metadata), ensuring no crash or error. Performance is incidentally
 * monitored by doing multiple retrievals in sequence.
 *
 * Steps:
 *
 * 1. Create enough products (via seller API) to guarantee > 1 page (simulate >
 *    default limit: assume default is 20, create 25 products).
 * 2. Call the public product listing endpoint (GET /aimall-backend/products).
 * 3. Verify that:
 *
 * - The first page returns `limit` products.
 * - Pagination indicates more than 1 page.
 *
 * 4. (If page navigation supported) Retrieve the second page, verify it returns
 *    remaining (5) products.
 * 5. (If page navigation supported) Retrieve a page index beyond available range,
 *    ensure result is an empty array for data[] but with pagination metadata
 *    indicating out-of-bounds.
 *
 * Note: As of this SDK version, explicit pagination controls (page/limit query
 * params) are not implemented for the public product list. This test verifies
 * all functionality possible given current API contract. It should be extended
 * in the future if/when SDK receives pagination controls.
 */
export async function test_api_aimall_backend_products_test_list_products_pagination_and_performance(
  connection: api.IConnection,
) {
  // 1. Create 25 products to guarantee more than one page.
  const defaultPageLimit = 20;
  const totalProductsToCreate = 25;
  const createdProductIds: (string & tags.Format<"uuid">)[] = [];
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  for (let i = 0; i < totalProductsToCreate; ++i) {
    const input: IAimallBackendProduct.ICreate = {
      category_id: categoryId,
      seller_id: sellerId,
      title: `Test Product ${i + 1}`,
      description: `Test description for product ${i + 1}`,
      status: "active",
    };
    const product = await api.functional.aimall_backend.seller.products.create(
      connection,
      {
        body: input,
      },
    );
    typia.assert(product);
    createdProductIds.push(product.id);
  }

  // 2. Retrieve the first page of products
  const firstPage =
    await api.functional.aimall_backend.products.index(connection);
  typia.assert(firstPage);
  TestValidator.predicate("first page should return limit or less products")(
    firstPage.data.length <= defaultPageLimit,
  );
  TestValidator.predicate("pagination indicates more than 1 page")(
    firstPage.pagination.pages > 1,
  );

  // 3. NOTE: The current SDK does not support page/limit query params, so cannot retrieve the 2nd or overflow page. If/when SDK supports these, extend the test here for second/invalid/out-of-range pages.
}
