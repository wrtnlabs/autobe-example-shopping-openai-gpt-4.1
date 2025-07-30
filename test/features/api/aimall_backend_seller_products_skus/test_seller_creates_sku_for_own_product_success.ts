import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Verify that a seller can create a new SKU for a product they own.
 *
 * This test validates that after a seller account and its product are created,
 * the seller can create a SKU for their product using the appropriate endpoint.
 * The system requires a unique sku_code, validates foreign key ownership, and
 * ensures successful creation of the SKU.
 *
 * Test Workflow:
 *
 * 1. Create a new seller using the administrator API.
 * 2. Create a product assigned to the seller using the seller products API (using
 *    the seller's UUID).
 * 3. Attempt to create a SKU for the seller's product with a unique sku_code,
 *    using the productId from the created product.
 * 4. Validate that the returned SKU has the correct product_id, that the sku_code
 *    matches, and that an id is assigned.
 * 5. Assert output structure for type safety and data integrity.
 */
export async function test_api_aimall_backend_seller_products_skus_test_seller_creates_sku_for_own_product_success(
  connection: api.IConnection,
) {
  // 1. Create a new seller (admin onboarding to get seller_id)
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: sellerInput,
      },
    );
  typia.assert(seller);

  // 2. Create a product for that seller
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(), // Assume category exists or is not enforced in test
    seller_id: seller.id,
    title: RandomGenerator.paragraph()(2),
    description: RandomGenerator.paragraph()(3),
    main_thumbnail_uri: undefined, // optional
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    {
      body: productInput,
    },
  );
  typia.assert(product);

  // 3. Create a unique SKU for that product
  const sku_code = RandomGenerator.alphaNumeric(12);
  const skuInput: IAimallBackendSku.ICreate = {
    product_id: product.id,
    sku_code: sku_code,
  };
  const sku = await api.functional.aimall_backend.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuInput,
    },
  );
  typia.assert(sku);

  // 4. Validate returned SKU fields
  TestValidator.equals("sku.product_id matches product.id")(sku.product_id)(
    product.id,
  );
  TestValidator.equals("sku.sku_code matches input")(sku.sku_code)(sku_code);
  TestValidator.predicate("SKU id is a non-empty uuid")(
    typeof sku.id === "string" && sku.id.length > 10,
  );
}
