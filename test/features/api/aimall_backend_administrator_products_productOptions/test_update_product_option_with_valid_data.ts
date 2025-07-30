import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductOption";

/**
 * Test the administrator endpoint for updating a product option with valid
 * data.
 *
 * This scenario validates that an administrator can successfully update a
 * product option for a product they control, reflecting the changes accurately
 * in the returned entity. The business logic enforces uniqueness per (product,
 * name, value) and correct linkage.
 *
 * Steps:
 *
 * 1. Create a seller using administrator privileges.
 * 2. Create a product owned by that seller with required fields, using admin
 *    functions.
 * 3. Create a product option (e.g., name: "Color", value: "Red") for this product
 *    via admin endpoint.
 * 4. Perform a valid update on the option—for example, change the value to
 *    "Blue"—by calling the admin update endpoint, specifying both productId and
 *    productOptionId.
 * 5. Assert the update operation succeeds and the option in the response matches
 *    the new name/value exactly while all IDs remain consistent.
 */
export async function test_api_aimall_backend_administrator_products_productOptions_test_update_product_option_with_valid_data(
  connection: api.IConnection,
) {
  // 1. Create a seller with required fields
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(10),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 2. Create a product owned by this seller
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.alphabets(8),
          status: "active",
          description: RandomGenerator.paragraph()(),
          // main_thumbnail_uri is optional and omitted in this test
        },
      },
    );
  typia.assert(product);

  // 3. Create a product option for the product (Color: Red)
  const optionName = "Color";
  const optionValue = "Red";
  const productOption =
    await api.functional.aimall_backend.administrator.products.productOptions.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          name: optionName,
          value: optionValue,
        },
      },
    );
  typia.assert(productOption);

  // 4. Update the product option, changing value to 'Blue'
  const newValue = "Blue";
  const updatedOption =
    await api.functional.aimall_backend.administrator.products.productOptions.update(
      connection,
      {
        productId: productOption.product_id,
        productOptionId: productOption.id,
        body: {
          value: newValue,
        },
      },
    );
  typia.assert(updatedOption);

  // 5. Assert IDs and values are as expected after update
  TestValidator.equals("product option id")(updatedOption.id)(productOption.id);
  TestValidator.equals("product option product_id")(updatedOption.product_id)(
    productOption.product_id,
  );
  TestValidator.equals("product option name unchanged")(updatedOption.name)(
    optionName,
  );
  TestValidator.equals("product option value updated")(updatedOption.value)(
    newValue,
  );
}
