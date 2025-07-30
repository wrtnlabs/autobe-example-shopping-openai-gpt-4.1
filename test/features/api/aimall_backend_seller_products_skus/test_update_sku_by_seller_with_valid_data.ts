import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validate that a seller can update their own SKU with valid data, ensuring SKU
 * ownership and business rule compliance.
 *
 * This test ensures:
 *
 * - A seller can create a product and a SKU under their ownership.
 * - The SKU's mutable property (sku_code) can be updated to a new, unique value.
 * - After the update, the SKU remains linked to the original product, and the
 *   update is reflected in the returned data.
 * - All type and business relationships are preserved and proper.
 *
 * Steps:
 *
 * 1. Create a product for the seller (simulating ownership).
 * 2. Create a SKU for this product.
 * 3. Update the SKU's sku_code to a new valid value.
 * 4. Assert the returned SKU has the updated code and untouched product linkage.
 */
export async function test_api_aimall_backend_seller_products_skus_test_update_sku_by_seller_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a product for the seller
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph()(1),
    description: RandomGenerator.content()()(),
    main_thumbnail_uri: undefined,
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);
  TestValidator.equals("ownership")(product.seller_id)(productInput.seller_id);
  TestValidator.equals("category")(product.category_id)(
    productInput.category_id,
  );

  // 2. Create a SKU for this product
  const skuInput: IAimallBackendSku.ICreate = {
    product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(10),
  };
  const createdSku =
    await api.functional.aimall_backend.seller.products.skus.create(
      connection,
      {
        productId: product.id,
        body: skuInput,
      },
    );
  typia.assert(createdSku);
  TestValidator.equals("sku-product link")(createdSku.product_id)(product.id);
  TestValidator.equals("sku_code")(createdSku.sku_code)(skuInput.sku_code);

  // 3. Update the SKU's sku_code to a new, unique value
  const newSkuCode = RandomGenerator.alphaNumeric(12);
  const updatedSku =
    await api.functional.aimall_backend.seller.products.skus.update(
      connection,
      {
        productId: product.id,
        skuId: createdSku.id,
        body: { sku_code: newSkuCode },
      },
    );
  typia.assert(updatedSku);

  // 4. Validate the SKU was updated and still properly linked
  TestValidator.equals("sku_code updated")(updatedSku.sku_code)(newSkuCode);
  TestValidator.equals("sku still linked to product")(updatedSku.product_id)(
    product.id,
  );
}
