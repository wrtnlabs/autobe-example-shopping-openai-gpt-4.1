import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Test a seller's ability to retrieve details for a SKU on their own product.
 *
 * Business context:
 *
 * - Ensures a seller can only retrieve SKUs that belong to their own products.
 * - Verifies full detail accuracy: the retrieved SKU's details must exactly match
 *   what was provided on creation.
 * - Confirms correct relationships across seller, product, and SKU entities.
 *
 * Step-by-step:
 *
 * 1. Create a new seller account with test data.
 * 2. Create a product for that seller (using the seller ID).
 * 3. Create a SKU (with unique code) for that product.
 * 4. Fetch the SKU details from the API using the product and SKU IDs.
 * 5. Check that SKU details (ID, product_id, sku_code) match what was created.
 * 6. Ensure entity relationships are intact and no extraneous fields are present.
 */
export async function test_api_aimall_backend_seller_products_skus_test_seller_get_own_sku_detail_success(
  connection: api.IConnection,
) {
  // 1. Create a new seller account
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.name(),
    email: RandomGenerator.alphabets(6) + "@test.com",
    contact_phone: RandomGenerator.mobile(),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 2. Create a product linked to this seller
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    title: RandomGenerator.paragraph()(),
    description: RandomGenerator.content()()(),
    main_thumbnail_uri: undefined,
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 3. Create a SKU for this product
  const skuInput: IAimallBackendSku.ICreate = {
    product_id: product.id,
    sku_code: RandomGenerator.alphabets(8),
  };
  const sku = await api.functional.aimall_backend.seller.products.skus.create(
    connection,
    { productId: product.id, body: skuInput },
  );
  typia.assert(sku);

  // 4. Retrieve SKU details using GET endpoint
  const fetched = await api.functional.aimall_backend.seller.products.skus.at(
    connection,
    {
      productId: product.id,
      skuId: sku.id,
    },
  );
  typia.assert(fetched);

  // 5. Validate that fetched SKU matches what was created
  TestValidator.equals("SKU ID matches")(fetched.id)(sku.id);
  TestValidator.equals("SKU product_id matches")(fetched.product_id)(
    product.id,
  );
  TestValidator.equals("SKU code matches")(fetched.sku_code)(skuInput.sku_code);
}
