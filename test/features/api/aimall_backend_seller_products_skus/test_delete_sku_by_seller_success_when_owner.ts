import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Test that a seller can delete their own SKU when there are no constraints.
 *
 * 1. Create a valid product as a seller.
 * 2. Create a SKU for that product.
 * 3. Delete the SKU as the seller (owner).
 * 4. (Skipped: Validate that SKU is not found after deletion, as no GET endpoint
 *    is provided.)
 */
export async function test_api_aimall_backend_seller_products_skus_test_delete_sku_by_seller_success_when_owner(
  connection: api.IConnection,
) {
  // 1. Create a valid product
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph()(),
    status: "active",
    description: RandomGenerator.content()()(),
    main_thumbnail_uri: undefined,
  };

  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: productInput,
    },
  );
  typia.assert(product);
  TestValidator.equals("product title matches")(product.title)(
    productInput.title,
  );

  // 2. Create a SKU for that product
  const skuInput: IAimallBackendSku.ICreate = {
    product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(10),
  };
  const sku = await api.functional.aimall_backend.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuInput,
    },
  );
  typia.assert(sku);
  TestValidator.equals("sku matches parent")(sku.product_id)(product.id);

  // 3. Delete the SKU as seller
  await api.functional.aimall_backend.seller.products.skus.erase(connection, {
    productId: product.id,
    skuId: sku.id,
  });
  // 4. Skipped: GET/validation after deletion, as endpoint is unavailable
}
