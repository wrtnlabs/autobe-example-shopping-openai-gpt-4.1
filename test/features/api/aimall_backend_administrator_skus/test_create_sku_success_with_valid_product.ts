import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Test SKU creation as administrator referencing a valid product.
 *
 * This verifies integration between product and SKU creation and business logic
 * around SKU uniqueness per product.
 *
 * Steps:
 *
 * 1. Create a new product using valid data via administrator endpoint (ensures an
 *    existing product to link new SKU to).
 * 2. Create a new SKU referencing that product, using a unique SKU code (tests
 *    positive path for SKU creation).
 * 3. Validate that the SKU is created and the returned fields match expectations
 *    (IDs are UUIDs, SKU code matches submission, relationship to product is
 *    correct).
 * 4. Attempt to create another SKU on the same product with the SAME sku_code
 *    (negative case), and assert that a uniqueness error is thrown and not
 *    allowed.
 */
export async function test_api_aimall_backend_administrator_skus_test_create_sku_success_with_valid_product(
  connection: api.IConnection,
) {
  // Step 1: Create a new product
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.alphabets(10),
    status: "active",
    description: RandomGenerator.paragraph()(),
    // main_thumbnail_uri is optional and omitted
  };
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // Step 2: Create a new SKU referencing the product
  const sku_code = RandomGenerator.alphaNumeric(12);
  const skuInput: IAimallBackendSku.ICreate = {
    product_id: product.id,
    sku_code,
  };
  const sku = await api.functional.aimall_backend.administrator.skus.create(
    connection,
    { body: skuInput },
  );
  typia.assert(sku);
  TestValidator.equals("sku_code")(sku.sku_code)(sku_code);
  TestValidator.equals("sku.product_id")(sku.product_id)(product.id);
  TestValidator.predicate("sku.id is uuid")(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(
      sku.id,
    ),
  );

  // Step 4: Attempt duplicate SKU code for that product, should fail
  const duplicateSkuInput: IAimallBackendSku.ICreate = {
    product_id: product.id,
    sku_code,
  };
  await TestValidator.error("duplicate SKU code should be rejected")(
    async () => {
      await api.functional.aimall_backend.administrator.skus.create(
        connection,
        { body: duplicateSkuInput },
      );
    },
  );
}
