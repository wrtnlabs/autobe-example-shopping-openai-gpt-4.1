import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSku";

/**
 * Validate successful retrieval of SKU details via administrator endpoint by
 * SKU ID.
 *
 * This test verifies that the administrator/sku GET endpoint responds with
 * complete and accurate SKU information when given a valid SKU identifier.
 *
 * Business context:
 *
 * - SKU records are always associated with products. Therefore, a product must
 *   first exist before a SKU can be created for retrieval testing.
 * - We simulate the full flow: create a product, bind a SKU to it, then fetch the
 *   SKU detail using the administrator/sku GET endpoint.
 *
 * Test Steps:
 *
 * 1. Create a product with all minimum required fields and ensure its creation is
 *    successful.
 * 2. Create a new SKU bound to the product and validate it is correctly stored,
 *    capturing its generated id.
 * 3. Retrieve the SKU details with the SKU id via the GET endpoint as
 *    administrator.
 * 4. Assert the response structure and content matches the values provided at
 *    creation for all fields, especially association integrity (i.e.,
 *    product_id).
 * 5. Validate that type constraints (uuid for product_id/skuId, correct sku_code,
 *    etc.) hold in the response.
 */
export async function test_api_skus_test_get_sku_by_id_success(
  connection: api.IConnection,
) {
  // 1. Create a product for SKU association
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph()(),
    description: RandomGenerator.alphabets(30),
    main_thumbnail_uri: undefined,
    status: "active",
  };
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: productInput,
      },
    );
  typia.assert(product);

  // 2. Create a SKU tied to that product
  const skuInput: IAimallBackendSku.ICreate = {
    product_id: product.id,
    sku_code: RandomGenerator.alphaNumeric(10),
  };
  const createdSku =
    await api.functional.aimall_backend.administrator.skus.create(connection, {
      body: skuInput,
    });
  typia.assert(createdSku);

  // 3. Retrieve the SKU detail by SKU id
  const retrievedSku =
    await api.functional.aimall_backend.administrator.skus.at(connection, {
      skuId: createdSku.id,
    });
  typia.assert(retrievedSku);

  // 4. Validate that attributes match and type constraints hold
  TestValidator.equals("SKU id matches")(retrievedSku.id)(createdSku.id);
  TestValidator.equals("SKU product id matches")(retrievedSku.product_id)(
    product.id,
  );
  TestValidator.equals("SKU code matches")(retrievedSku.sku_code)(
    skuInput.sku_code,
  );
}
