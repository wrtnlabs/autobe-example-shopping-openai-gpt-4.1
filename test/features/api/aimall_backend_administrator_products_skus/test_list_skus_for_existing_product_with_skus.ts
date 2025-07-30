import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IPageIAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSku";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Test listing all SKUs for a product with several associated SKUs.
 *
 * This test ensures that when a product is registered and multiple SKUs are
 * created for that product, the GET
 * /aimall-backend/administrator/products/{productId}/skus endpoint returns all
 * those SKUs. It covers the complete workflow for associating SKUs and
 * retrieving them.
 *
 * Steps:
 *
 * 1. Create a product as an administrator
 * 2. Create multiple SKUs associated with this product via POST endpoint
 * 3. Call GET /products/{productId}/skus to list SKUs for the product
 * 4. Verify that all created SKUs are included in the response data array (by id
 *    and sku_code)
 * 5. Validate response type and pagination structure
 */
export async function test_api_aimall_backend_administrator_products_skus_test_list_skus_for_existing_product_with_skus(
  connection: api.IConnection,
) {
  // 1. Create a product as administrator
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: typia.random<string & tags.Format<"uuid">>(),
          title: "Test Product " + RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph()(),
          main_thumbnail_uri: RandomGenerator.alphabets(16),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 2. Create multiple SKUs for this product
  const NUM_SKUS = 3;
  const skuPrefix = `TST-${Date.now()}`;
  const skuCodes: string[] = ArrayUtil.repeat(NUM_SKUS)(
    (i) => skuPrefix + "-" + RandomGenerator.alphaNumeric(6),
  );
  const createdSkus: IAimallBackendSku[] = [];
  for (const sku_code of skuCodes) {
    const sku =
      await api.functional.aimall_backend.administrator.products.skus.create(
        connection,
        {
          productId: product.id,
          body: {
            product_id: product.id,
            sku_code,
          } satisfies IAimallBackendSku.ICreate,
        },
      );
    typia.assert(sku);
    createdSkus.push(sku);
  }

  // 3. Call GET to list SKUs for product
  const output =
    await api.functional.aimall_backend.administrator.products.skus.index(
      connection,
      { productId: product.id },
    );
  typia.assert(output);

  // Assert all GET data are valid SKU records
  for (const sku of output.data) {
    typia.assert(sku);
  }

  // 4. Verify all created SKUs are in the response data (by id and sku_code and product_id)
  for (const created of createdSkus) {
    const found = output.data.find(
      (sku) =>
        sku.id === created.id &&
        sku.sku_code === created.sku_code &&
        sku.product_id === product.id,
    );
    TestValidator.predicate(
      `SKU with id=${created.id} and sku_code=${created.sku_code} should be listed`,
    )(!!found);
  }

  // 5. Validate pagination structure covers all created SKUs
  TestValidator.predicate(
    "Pagination records should be >= number of created SKUs",
  )(output.pagination.records >= createdSkus.length);
  TestValidator.predicate("Output data should include all created SKUs")(
    output.data.length >= createdSkus.length,
  );
}
