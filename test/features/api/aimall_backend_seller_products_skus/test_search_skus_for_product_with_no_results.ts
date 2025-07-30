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
 * Validate searching for SKUs of a product with a filter that yields no
 * results.
 *
 * Business context:
 *
 * - A seller with at least one product and one SKU wants to use the filtered SKU
 *   search feature with a code that does not exist.
 * - The test ensures that when filtered with an invalid/nonexistent sku_code, no
 *   SKUs are returned, and pagination indicates zero records.
 *
 * Workflow:
 *
 * 1. Create a seller (via administrator endpoint)
 * 2. Create a product for the seller
 * 3. Create at least one SKU for the product with a known sku_code
 * 4. Execute the SKU search PATCH endpoint for this product, using a deliberately
 *    invalid/nonexistent sku_code filter
 * 5. Validate:
 *
 *    - The data array is empty (length zero)
 *    - Pagination records count is zero
 */
export async function test_api_aimall_backend_seller_products_skus_test_search_skus_for_product_with_no_results(
  connection: api.IConnection,
) {
  // 1. Create a seller
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphaNumeric(10),
    email: `${RandomGenerator.alphaNumeric(10)}@example.com`,
    contact_phone: RandomGenerator.alphaNumeric(8),
    status: "pending",
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
    title: RandomGenerator.alphabets(6),
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 3. Create a SKU for the product
  const skuCode = `SKUTEST${RandomGenerator.alphaNumeric(8)}`;
  const skuInput: IAimallBackendSku.ICreate = {
    product_id: product.id,
    sku_code: skuCode,
  };
  const sku = await api.functional.aimall_backend.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuInput,
    },
  );
  typia.assert(sku);

  // 4. Search for SKUs with a nonexistent sku_code
  const searchInput: IAimallBackendSku.IRequest = {
    product_id: product.id,
    sku_code: "DOES_NOT_EXIST_SKU_CODE",
    page: 1,
    limit: 10,
  };
  const searchResult =
    await api.functional.aimall_backend.seller.products.skus.search(
      connection,
      {
        productId: product.id,
        body: searchInput,
      },
    );
  typia.assert(searchResult);

  // 5. Validate that no SKUs are returned and pagination is zero
  TestValidator.equals("data is empty")(searchResult.data)([]);
  TestValidator.equals("records is zero")(searchResult.pagination.records)(0);
}
