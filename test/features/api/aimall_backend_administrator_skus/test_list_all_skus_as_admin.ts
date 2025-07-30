import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";
import type { IPageIAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSku";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Test that an administrator can retrieve a paginated list of all SKUs in the
 * system catalog.
 *
 * This test will:
 *
 * 1. Create several products via the administrator API.
 * 2. For each product, create multiple SKUs to populate the catalog.
 * 3. Use the administrator SKU GET endpoint to fetch the paginated SKU list as
 *    admin.
 * 4. Validate that all created SKUs appear in the fetched results with correct
 *    product references and sku_codes.
 * 5. Confirm the pagination metadata is correct and that the total records is at
 *    least the number of SKUs created in the test.
 */
export async function test_api_aimall_backend_administrator_skus_test_list_all_skus_as_admin(
  connection: api.IConnection,
) {
  // Step 1: Create several products
  const productsCount = 3;
  const products: IAimallBackendProduct[] = [];
  for (let i = 0; i < productsCount; ++i) {
    const product =
      await api.functional.aimall_backend.administrator.products.create(
        connection,
        {
          body: {
            category_id: typia.random<string & tags.Format<"uuid">>(),
            seller_id: typia.random<string & tags.Format<"uuid">>(),
            title: `E2E Test Product #${i + 1}`,
            description: `E2E Product #${i + 1} for SKU catalog test`,
            status: "active",
            // main_thumbnail_uri omitted because string|undefined only; null is invalid
          } satisfies IAimallBackendProduct.ICreate,
        },
      );
    typia.assert(product);
    products.push(product);
  }

  // Step 2: For each product, create SKUs
  const allSkus: IAimallBackendSku[] = [];
  let skuGlobalIndex = 1;
  for (const product of products) {
    const skuPerProduct = 2;
    for (let j = 0; j < skuPerProduct; ++j, ++skuGlobalIndex) {
      const skuCode = `E2ESKU${product.id.substring(0, 8)}_${skuGlobalIndex}`;
      const sku =
        await api.functional.aimall_backend.administrator.products.skus.create(
          connection,
          {
            productId: product.id,
            body: {
              product_id: product.id,
              sku_code: skuCode,
            } satisfies IAimallBackendSku.ICreate,
          },
        );
      typia.assert(sku);
      allSkus.push(sku);
    }
  }

  // Step 3: Fetch the paginated SKU catalog (admin privilege is implied)
  const skuPage =
    await api.functional.aimall_backend.administrator.skus.index(connection);
  typia.assert(skuPage);

  // Step 4: Validate all created SKUs appear in the result set
  const createdSkuIds = new Set(allSkus.map((s) => s.id));
  const receivedSkuIds = new Set(skuPage.data.map((s) => s.id));
  for (const sku of allSkus) {
    TestValidator.predicate(`Created SKU present: ${sku.sku_code}`)(
      receivedSkuIds.has(sku.id),
    );
    // Extra: check product_id and sku_code match expectations
    const received = skuPage.data.find((s) => s.id === sku.id);
    if (received) {
      TestValidator.equals("product_id")(received.product_id)(sku.product_id);
      TestValidator.equals("sku_code")(received.sku_code)(sku.sku_code);
    }
  }

  // Step 5: Validate pagination metadata
  TestValidator.predicate("Pagination current page > 0")(
    skuPage.pagination.current > 0,
  );
  TestValidator.predicate("Pagination limit > 0")(skuPage.pagination.limit > 0);
  TestValidator.predicate("Pagination records >= SKUs created")(
    skuPage.pagination.records >= allSkus.length,
  );
  TestValidator.predicate("Pagination pages >= 1")(
    skuPage.pagination.pages >= 1,
  );
}
