import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validate that an administrator can retrieve SKU details for a valid SKU under
 * a valid product.
 *
 * Business context: Administrators must be able to retrieve the full detail of
 * any SKU variant belonging to products in the catalog. This is used for
 * product management, auditing, and stock tracking, and ensures that
 * SKU/product associations are enforced. The administrator should only be able
 * to retrieve an existing SKU for a valid product; both must be created and
 * associated correctly.
 *
 * Step-by-step process:
 *
 * 1. Use the administrator endpoint to create a new seller (needed for product
 *    ownership)
 * 2. Create a new product for the seller using the seller product creation
 *    endpoint
 * 3. Create a new SKU (variant) for the product using the seller SKU creation
 *    endpoint
 * 4. Retrieve the SKU details as an administrator using the administrator SKU
 *    detail endpoint, referencing the created productId and skuId
 * 5. Assert that all returned SKU fields (id, product_id, sku_code) match those
 *    from creation
 * 6. Assert that type and format of id and product_id are valid UUIDs
 */
export async function test_api_aimall_backend_administrator_products_skus_getByProductidAndSkuid(
  connection: api.IConnection,
) {
  // 1. Create seller
  const sellerCreateInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphaNumeric(10),
    email: `${RandomGenerator.alphaNumeric(6)}@autobe-test.com`,
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerCreateInput },
    );
  typia.assert(seller);

  // 2. Create product for the seller
  const productCreateInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    title: RandomGenerator.paragraph()(1),
    description: RandomGenerator.paragraph()(2),
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productCreateInput },
  );
  typia.assert(product);

  // 3. Create SKU for the product
  const skuCreateInput: IAimallBackendSku.ICreate = {
    product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(12),
  };
  const sku = await api.functional.aimall_backend.seller.products.skus.create(
    connection,
    { productId: product.id, body: skuCreateInput },
  );
  typia.assert(sku);

  // 4. Retrieve SKU details as administrator
  const retrievedSku =
    await api.functional.aimall_backend.administrator.products.skus.at(
      connection,
      { productId: product.id, skuId: sku.id },
    );
  typia.assert(retrievedSku);

  // 5. Assert all fields match
  TestValidator.equals("sku.id matches")(retrievedSku.id)(sku.id);
  TestValidator.equals("sku.product_id matches")(retrievedSku.product_id)(
    sku.product_id,
  );
  TestValidator.equals("sku.sku_code matches")(retrievedSku.sku_code)(
    sku.sku_code,
  );

  // 6. Assert UUID formats
  TestValidator.predicate("id is uuid")(
    retrievedSku.id.match(/^[0-9a-fA-F-]{36}$/) !== null,
  );
  TestValidator.predicate("product_id is uuid")(
    retrievedSku.product_id.match(/^[0-9a-fA-F-]{36}$/) !== null,
  );
}
