import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductOption";

/**
 * Test updating the name and value of an existing product option as a seller.
 *
 * This test covers the end-to-end seller workflow for updating a product
 * option:
 *
 * 1. Create a new seller (administrator access)
 * 2. Register a new product owned by that seller
 * 3. Add an initial product option to that product
 * 4. Update the product option's name and value using the PUT endpoint
 * 5. Verify the returned product option reflects the changes and remains linked to
 *    the original product
 * 6. Confirm the uniqueness constraint per (product, name, value) is maintained by
 *    trying to update it to a duplicate and expecting an error
 */
export async function test_api_aimall_backend_seller_products_productOptions_test_update_product_option_name_and_value_successfully(
  connection: api.IConnection,
) {
  // 1. Create a new seller
  const sellerInput: IAimallBackendSeller.ICreate = {
    business_name: RandomGenerator.alphaNumeric(8),
    email: RandomGenerator.alphaNumeric(8) + "@test.com",
    contact_phone:
      "010-" +
      typia
        .random<
          number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>
        >()
        .toString() +
      "-" +
      typia
        .random<
          number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>
        >()
        .toString(),
    status: "approved",
  };
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      { body: sellerInput },
    );
  typia.assert(seller);

  // 2. Register a new product
  const productInput: IAimallBackendProduct.ICreate = {
    category_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller.id,
    title: RandomGenerator.paragraph()(1),
    description: RandomGenerator.content()(1)(1),
    status: "active",
  };
  const product = await api.functional.aimall_backend.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 3. Add an initial product option
  const optionInput: IAimallBackendProductOption.ICreate = {
    product_id: product.id,
    name: "Color",
    value: "Red",
  };
  const productOption =
    await api.functional.aimall_backend.seller.products.productOptions.create(
      connection,
      { productId: product.id, body: optionInput },
    );
  typia.assert(productOption);

  // 4. Update the product option's name and value
  const updateInput: IAimallBackendProductOption.IUpdate = {
    name: "Shade",
    value: "Crimson",
  };
  const updated =
    await api.functional.aimall_backend.seller.products.productOptions.update(
      connection,
      {
        productId: product.id,
        productOptionId: productOption.id,
        body: updateInput,
      },
    );
  typia.assert(updated);
  TestValidator.equals("product_id remains the same")(updated.product_id)(
    product.id,
  );
  TestValidator.equals("name updated")(updated.name)(updateInput.name);
  TestValidator.equals("value updated")(updated.value)(updateInput.value);

  // 5. Uniqueness: Try to create a duplicate and then update another to a duplicate (should fail)
  const duplicateInput: IAimallBackendProductOption.ICreate = {
    product_id: product.id,
    name: "Fabric",
    value: "Cotton",
  };
  const duplicateOption =
    await api.functional.aimall_backend.seller.products.productOptions.create(
      connection,
      { productId: product.id, body: duplicateInput },
    );
  typia.assert(duplicateOption);

  // Try to update the duplicateOption to have the (name, value) as the 'updated' option ("Shade", "Crimson") - must error
  TestValidator.error("updating to duplicate name/value should fail")(() =>
    api.functional.aimall_backend.seller.products.productOptions.update(
      connection,
      {
        productId: product.id,
        productOptionId: duplicateOption.id,
        body: updateInput,
      },
    ),
  );
}
