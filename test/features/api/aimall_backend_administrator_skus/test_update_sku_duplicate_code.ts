import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validate that updating a SKU's code to one that already exists for another
 * SKU under the same product fails.
 *
 * Business context:
 *
 * - SKU codes must be unique within a product. It should not be possible to
 *   update a SKU so that its sku_code matches another SKU under the same
 *   product.
 * - This ensures catalog integrity and correct product/SKU identification.
 *
 * Steps:
 *
 * 1. Create a product for the SKUs to belong to
 * 2. Create SKU A under that product with sku_code_A
 * 3. Create SKU B under that product with sku_code_B (distinct from sku_code_A)
 * 4. Attempt to update SKU B's sku_code to sku_code_A—should result in
 *    conflict/duplicate error
 * 5. Confirm that the API responds with an error (business logic conflict)
 */
export async function test_api_aimall_backend_administrator_skus_test_update_sku_duplicate_code(
  connection: api.IConnection,
) {
  // Step 1: Create a product
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: "Test Product for SKU duplication",
    description: "Testing SKU code update validation.",
    main_thumbnail_uri: undefined,
    status: "active",
  };
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // Step 2: Create SKU A under the product
  const skuCodeA = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const skuAInput: IAimallBackendSku.ICreate = {
    product_id: product.id,
    sku_code: skuCodeA,
  };
  const skuA = await api.functional.aimall_backend.administrator.skus.create(
    connection,
    { body: skuAInput },
  );
  typia.assert(skuA);

  // Step 3: Create SKU B (with a distinct sku_code) under the product
  let skuCodeB: string;
  do {
    skuCodeB = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  } while (skuCodeB === skuCodeA);
  const skuBInput: IAimallBackendSku.ICreate = {
    product_id: product.id,
    sku_code: skuCodeB,
  };
  const skuB = await api.functional.aimall_backend.administrator.skus.create(
    connection,
    { body: skuBInput },
  );
  typia.assert(skuB);

  // Step 4: Attempt to update SKU B's code to SKU A's code (which must fail)
  await TestValidator.error("updating sku_code to duplicate should fail")(
    async () => {
      await api.functional.aimall_backend.administrator.skus.update(
        connection,
        {
          skuId: skuB.id,
          body: {
            sku_code: skuCodeA,
          } satisfies IAimallBackendSku.IUpdate,
        },
      );
    },
  );
}
