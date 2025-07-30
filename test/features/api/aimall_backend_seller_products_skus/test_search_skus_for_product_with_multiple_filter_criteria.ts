import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IPageIAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSku";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test filtering and paginated search for SKUs belonging to a seller's product.
 *
 * Validates that the search function correctly filters by SKU code substring,
 * returns only matching SKUs, and paginates results. Ensures that pagination
 * metadata matches expectations (current page, limit, total records, and total
 * pages).
 *
 * Steps:
 *
 * 1. Create a seller account.
 * 2. Create a product belonging to the seller.
 * 3. Create at least 3 SKUs for the product, each with a distinct sku_code (two
 *    including 'AA' and one different).
 * 4. Search for SKUs with a partial code 'AA', request page 2, limit 2.
 * 5. Validate that all returned SKUs contain the filter substring, and check
 *    pagination metadata is correct.
 */
export async function test_api_aimall_backend_seller_products_skus_test_search_skus_for_product_with_multiple_filter_criteria(
  connection: api.IConnection,
) {
  // 1. Create a seller account
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphabets(10),
    email: `${RandomGenerator.alphaNumeric(10)}@test.com`,
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 2. Create a product for the seller
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    title: RandomGenerator.alphabets(20),
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 3. Create at least 3 SKUs for the product with distinct sku_code
  const skuCodes = [
    `TEST-KU-AAA`, // matches 'AA'
    `TEST-KU-BBB`, // does not match 'AA'
    `TEST-KU-AAB`, // matches 'AA'
  ];
  const skus = [];
  for (const code of skuCodes) {
    const sku = await api.functional.aimall_backend.seller.products.skus.create(
      connection,
      {
        productId: product.id,
        body: { product_id: product.id, sku_code: code },
      },
    );
    typia.assert(sku);
    skus.push(sku);
  }

  // 4. Search with partial code 'AA', page 2, limit 2
  const filterCode = "AA";
  const searchReq: IAimallBackendSku.IRequest = {
    product_id: product.id,
    sku_code: filterCode,
    page: 2,
    limit: 2,
  };
  const result =
    await api.functional.aimall_backend.seller.products.skus.search(
      connection,
      { productId: product.id, body: searchReq },
    );
  typia.assert(result);

  // 5. Validate SKUs and pagination
  // All returned SKUs must match filter substring
  for (const sku of result.data) {
    if (!sku.sku_code.includes(filterCode)) {
      throw new Error(
        `SKU ${sku.id} sku_code does not match filter '${filterCode}': ${sku.sku_code}`,
      );
    }
  }
  // Pagination checks
  TestValidator.equals("pagination.current")(result.pagination.current)(2);
  TestValidator.equals("pagination.limit")(result.pagination.limit)(2);
  TestValidator.predicate("pagination.records at least 2")(
    result.pagination.records >= 2,
  );
  TestValidator.predicate("pagination.pages at least 1")(
    result.pagination.pages >= 1,
  );
}
