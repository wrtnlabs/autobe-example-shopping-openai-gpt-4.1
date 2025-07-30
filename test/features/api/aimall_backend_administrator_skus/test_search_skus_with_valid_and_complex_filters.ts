import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IPageIAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSku";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test for advanced SKU search with filtering and pagination.
 *
 * This test validates that an administrator can:
 *
 * - Search SKUs by product association (product_id filter)
 * - Search SKUs by partial SKU code
 * - Retrieve paginated SKU results (page/limit)
 *
 * Steps:
 *
 * 1. Create a product (to guarantee there's a parent product to associate SKUs)
 * 2. Create a batch of SKUs for this product (with systematically varying codes)
 * 3. Search SKUs only by product_id and validate every returned SKU belongs to the
 *    product
 * 4. Search by partial SKU code (should return subset - filtered SKUs with code
 *    matching the pattern)
 * 5. Paginate through results (page 1, page 2), validate page sizes and boundaries
 * 6. Confirm paginated IDs are from created SKUs, and no extraneous records leak
 *    through
 * 7. Permission negative test is acknowledged in comments: currently not possible
 *    without a non-admin context
 */
export async function test_api_aimall_backend_administrator_skus_test_search_skus_with_valid_and_complex_filters(
  connection: api.IConnection,
) {
  // 1. Create a new product for the test - ensures valid parent for the SKUs
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: RandomGenerator.paragraph()(2),
          status: "active",
          description: RandomGenerator.content()(1)(),
          main_thumbnail_uri: undefined,
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create a batch of SKUs for this product, with controlled sku_code structure
  const baseSkuPrefix = RandomGenerator.alphaNumeric(8);
  const skus: IAimallBackendSku[] = [];
  for (let i = 0; i < 8; ++i) {
    const sku = await api.functional.aimall_backend.administrator.skus.create(
      connection,
      {
        body: {
          product_id: product.id,
          sku_code: baseSkuPrefix + "-" + String(i),
        } satisfies IAimallBackendSku.ICreate,
      },
    );
    skus.push(sku);
    typia.assert(sku);
  }

  // 3. Search for SKUs by product_id; expect all returned SKUs to be for the test product
  const searchResultByProduct =
    await api.functional.aimall_backend.administrator.skus.search(connection, {
      body: {
        product_id: product.id,
      } satisfies IAimallBackendSku.IRequest,
    });
  typia.assert(searchResultByProduct);
  for (const sku of searchResultByProduct.data) {
    TestValidator.equals("SKU returned matches product_id")(sku.product_id)(
      product.id,
    );
  }

  // 4. Search by partial SKU code: only SKUs containing this string as their code should be present
  const partialSkuCode = baseSkuPrefix + "-1";
  const searchResultBySkuCode =
    await api.functional.aimall_backend.administrator.skus.search(connection, {
      body: {
        sku_code: partialSkuCode,
      } satisfies IAimallBackendSku.IRequest,
    });
  typia.assert(searchResultBySkuCode);
  for (const sku of searchResultBySkuCode.data) {
    TestValidator.predicate(
      `SKU code includes expected substring '${partialSkuCode}'`,
    )(sku.sku_code.includes(partialSkuCode));
  }

  // 5. Check pagination (limit/page): Make sure boundaries are correct
  const pageSize = 3;
  const page1 = await api.functional.aimall_backend.administrator.skus.search(
    connection,
    {
      body: {
        product_id: product.id,
        page: 1,
        limit: pageSize,
      } satisfies IAimallBackendSku.IRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals("Page 1 result count")(page1.data.length)(
    Math.min(pageSize, skus.length),
  );

  const page2 = await api.functional.aimall_backend.administrator.skus.search(
    connection,
    {
      body: {
        product_id: product.id,
        page: 2,
        limit: pageSize,
      } satisfies IAimallBackendSku.IRequest,
    },
  );
  typia.assert(page2);
  TestValidator.equals("Page 2 result count")(page2.data.length)(
    Math.min(pageSize, skus.length - pageSize),
  );

  // 6. Comprehensive check: IDs returned via paging are from the created set, and there are no unknowns
  const allPagedSkuIds = [...page1.data, ...page2.data].map((sku) => sku.id);
  const createdSkuIds = skus.map((sku) => sku.id);
  for (const id of allPagedSkuIds) {
    TestValidator.predicate("Paged SKU is from created SKUs")(
      createdSkuIds.includes(id),
    );
  }

  // 7. Negative test for permission enforcement is acknowledged: Not possible (no non-admin API context available here).
}
