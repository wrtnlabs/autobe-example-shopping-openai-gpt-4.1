import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IPageIAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSku";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validates administrator SKU search by partial code and pagination for a
 * product.
 *
 * 1. Create a product as administrator (with random category/seller/required
 *    info).
 * 2. Create a set of SKUs for the product, each with a SKU code sharing a common
 *    prefix (e.g., SKU-12345-A, SKU-12345-B, SKU-54321-X, etc.).
 * 3. Perform a PATCH (search) for SKUs using a partial code (e.g., 'SKU-12345').
 *
 *    - Use pagination with tight limit (e.g., 2 per page) to check paginated result.
 *    - Validate that only SKUs whose codes contain the partial input are returned.
 *    - Validate pagination structure: current, limit, records, pages, and count
 *         matches total returned, and that actual SKUs are correct for filtered
 *         page.
 *    - Edge: Request additional pages as needed to confirm full match set is
 *         returned correctly.
 */
export async function test_api_aimall_backend_administrator_products_skus_test_admin_search_skus_by_partial_code_with_pagination(
  connection: api.IConnection,
) {
  // 1. Create a product as admin
  const category_id = typia.random<string & tags.Format<"uuid">>();
  const seller_id = typia.random<string & tags.Format<"uuid">>();
  const title = "Pagination Test Product";
  const status = "active";

  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id,
          seller_id,
          title,
          status,
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create several SKUs with similar codes (e.g., sku_code = PREFIX-<letter>)
  const common_prefix = `SKU-PAGINATE-${typia.random<number & tags.Type<"int32">>()}`;
  const matching_codes = ["A", "B", "C", "D"].map(
    (s) => `${common_prefix}-${s}`,
  );
  const nonmatching_codes = ["Z1", "Z2"].map((s) => `SKU-OTHER-${s}`);

  // Create SKUs with matching prefix
  const created_matching = await Promise.all(
    matching_codes.map((sku_code) =>
      api.functional.aimall_backend.administrator.products.skus.create(
        connection,
        {
          productId: product.id,
          body: {
            product_id: product.id,
            sku_code,
          } satisfies IAimallBackendSku.ICreate,
        },
      ),
    ),
  );
  created_matching.forEach((x) => typia.assert(x));
  // Create some non-matching SKUs
  const created_nonmatching = await Promise.all(
    nonmatching_codes.map((sku_code) =>
      api.functional.aimall_backend.administrator.products.skus.create(
        connection,
        {
          productId: product.id,
          body: {
            product_id: product.id,
            sku_code,
          } satisfies IAimallBackendSku.ICreate,
        },
      ),
    ),
  );
  created_nonmatching.forEach((x) => typia.assert(x));

  // 3. Search SKUs by partial code and paginate
  const limit = 2;
  let page = 1;
  let found: IAimallBackendSku[] = [];
  let total_records: number | undefined = undefined;
  let expected_total = matching_codes.length;
  let total_pages: number | undefined = undefined;

  do {
    const search_result =
      await api.functional.aimall_backend.administrator.products.skus.search(
        connection,
        {
          productId: product.id,
          body: {
            product_id: product.id,
            sku_code: common_prefix, // partial search, should match all four
            page,
            limit,
          } satisfies IAimallBackendSku.IRequest,
        },
      );
    typia.assert(search_result);

    if (total_records === undefined) {
      // On first page
      total_records = search_result.pagination.records;
      total_pages = search_result.pagination.pages;
      TestValidator.equals("pagination.records = #matching codes")(
        total_records,
      )(expected_total);
      TestValidator.predicate("records should be >= returned data")(
        total_records! >= search_result.data.length,
      );
      TestValidator.equals("limit")(search_result.pagination.limit)(limit);
    }
    TestValidator.equals("pagination.current = page")(
      search_result.pagination.current,
    )(page);
    found = found.concat(search_result.data);

    // All returned must have sku_code with the searched prefix, and product_id matches
    search_result.data.forEach((sku) => {
      TestValidator.predicate("sku_code must contain partial")(
        sku.sku_code.includes(common_prefix),
      );
      TestValidator.equals("product_id matches")(sku.product_id)(product.id);
    });
  } while (++page <= (total_pages ?? 1));

  // At end, found set matches only the SKUs with the wanted prefix; nonmatching never appear
  const found_codes = found.map((x) => x.sku_code).sort();
  TestValidator.equals("Only expected SKUs matched")(found_codes)(
    matching_codes.sort(),
  );
  TestValidator.notEquals("Nonmatching SKUs not matched")(found_codes)(
    nonmatching_codes,
  );
}
