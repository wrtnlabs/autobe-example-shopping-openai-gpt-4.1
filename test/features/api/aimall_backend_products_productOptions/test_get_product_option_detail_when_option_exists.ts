import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductOption";

/**
 * Verify retrieving the detail information for a specific product option when
 * the option exists, including all field and reference relations.
 *
 * This test covers the case where an option for a product (e.g., color or size
 * variant) is created and must be accurately retrieved by its exact ID and
 * parent product ID. The test ensures referential integrity, completeness of
 * returned fields, and data consistency between creation and retrieval.
 *
 * Steps:
 *
 * 1. Create a new product via the administrator API, using plausible random field
 *    values for category, seller, title, and status.
 * 2. Add a product option to the created product, specifying a unique combination
 *    of name/value (e.g., Color/Red), referencing the product_id. Capture the
 *    returned option data.
 * 3. Retrieve the product option detail using the productId and productOptionId
 *    returned from previous steps through the GET endpoint under test.
 * 4. Assert that the retrieved option matches the data of the created option,
 *    field by field, including id, product_id, name, and value. Also assert
 *    that product_id equals the product's id.
 */
export async function test_api_aimall_backend_products_productOptions_test_get_product_option_detail_when_option_exists(
  connection: api.IConnection,
) {
  // 1. Create product with realistic data
  const productInput = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    title: RandomGenerator.paragraph()(),
    description: RandomGenerator.content()()(),
    main_thumbnail_uri: undefined, // optional, can be undefined
    status: "active",
  } satisfies IAimallBackendProduct.ICreate;
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      { body: productInput },
    );
  typia.assert(product);

  // 2. Add a product option to the product
  const optionInput = {
    product_id: product.id,
    name: RandomGenerator.alphaNumeric(8),
    value: RandomGenerator.alphaNumeric(6),
  } satisfies IAimallBackendProductOption.ICreate;
  const productOption =
    await api.functional.aimall_backend.administrator.products.productOptions.create(
      connection,
      { productId: product.id, body: optionInput },
    );
  typia.assert(productOption);

  // 3. Retrieve the product option by product ID and option ID
  const retrieved =
    await api.functional.aimall_backend.products.productOptions.at(connection, {
      productId: product.id,
      productOptionId: productOption.id,
    });
  typia.assert(retrieved);

  // 4. Assert all fields match
  TestValidator.equals("option.id matches")(retrieved.id)(productOption.id);
  TestValidator.equals("option.product_id matches")(retrieved.product_id)(
    optionInput.product_id,
  );
  TestValidator.equals("option.name matches")(retrieved.name)(optionInput.name);
  TestValidator.equals("option.value matches")(retrieved.value)(
    optionInput.value,
  );
  TestValidator.equals("option.product_id equals product.id")(
    retrieved.product_id,
  )(product.id);
}
