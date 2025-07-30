import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IPageIAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendSku";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Test the ability of a seller to retrieve the list of SKUs (Stock Keeping
 * Units) they have registered for one of their products.
 *
 * This scenario validates that:
 *
 * - A seller account can be created (simulating onboarding by an administrator)
 * - The seller can register a product under their account
 * - The seller can create multiple SKUs for the given product
 * - When requesting the SKU list for the product, all SKUs are returned and are
 *   correct for that product
 *
 * Steps:
 *
 * 1. Register a new seller using administrator endpoint
 * 2. Register a new product under this seller's account
 * 3. Register multiple SKUs under this product
 * 4. Retrieve the list of SKUs via GET
 *    /aimall-backend/seller/products/{productId}/skus
 * 5. Ensure the list matches all created SKUs (IDs and codes), no more and no less
 */
export async function test_api_aimall_backend_seller_products_skus_test_seller_list_own_product_skus_success(
  connection: api.IConnection,
) {
  // 1. Register a new seller via administrator endpoint
  const sellerCreateInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphaNumeric(12),
    email: RandomGenerator.alphaNumeric(10) + "@test-company.com",
    contact_phone:
      "010" +
      typia
        .random<string & tags.Format<"uuid">>()
        .replace(/[^0-9]/g, "")
        .substring(0, 8),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerCreateInput },
    );
  typia.assert(seller);

  // 2. Register a new product for this seller
  const productCreateInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    title: RandomGenerator.paragraph()(12),
    description: RandomGenerator.content()()(30),
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productCreateInput },
  );
  typia.assert(product);

  // 3. Add multiple SKUs for this product
  const skuInputs: IAimallBackendSku.ICreate[] = ArrayUtil.repeat(3)((i) => ({
    product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(8) + i,
  }));
  const createdSkus: IAimallBackendSku[] = [];
  for (const skuInput of skuInputs) {
    const sku = await api.functional.aimall_backend.seller.products.skus.create(
      connection,
      { productId: product.id, body: skuInput },
    );
    typia.assert(sku);
    createdSkus.push(sku);
  }

  // 4. Retrieve the list of SKUs via GET endpoint
  const listResult =
    await api.functional.aimall_backend.seller.products.skus.index(connection, {
      productId: product.id,
    });
  typia.assert(listResult);
  TestValidator.equals("pagination count matches created count")(
    listResult.data.length,
  )(createdSkus.length);
  // 5. Each SKU in the createdSkus should be in the response data
  for (const created of createdSkus) {
    const found = listResult.data.find(
      (item) =>
        item.id === created.id &&
        item.sku_code === created.sku_code &&
        item.product_id === product.id,
    );
    TestValidator.predicate(
      `created SKU should appear in results - id: ${created.id}`,
    )(!!found);
  }
  // Optionally: verify that no extra SKUs are present (all in response must match created SKUs)
  for (const sku of listResult.data) {
    const found = createdSkus.find(
      (c) =>
        c.id === sku.id &&
        c.sku_code === sku.sku_code &&
        c.product_id === product.id,
    );
    TestValidator.predicate(
      `result SKU must be from created set - id: ${sku.id}`,
    )(!!found);
  }
}
