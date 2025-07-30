import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductOption";

/**
 * Validate that creating a product option with a duplicate name and value for
 * the same product is not permitted.
 *
 * This test executes the following steps:
 *
 * 1. Create a new seller account for product/option ownership.
 * 2. Create a product, owned by this seller, with valid references.
 * 3. Create an initial product option (e.g., name="Color", value="Red") for the
 *    product.
 * 4. Attempt to create a second product option with the EXACT SAME name and value
 *    for the same product.
 * 5. Confirm that a uniqueness/conflict/business validation error is thrown by the
 *    API as required (runtime error).
 * 6. (Sanity Check) Create another product owned by the same seller, and create an
 *    option with the same name and value as above there; ensure there is no
 *    conflict (conflict is within product only).
 *
 * This validates the API's enforcement of uniqueness for option (name, value)
 * per product, but NOT globally. It also covers error handling and proper
 * business constraint enforcement.
 */
export async function test_api_aimall_backend_seller_products_productOptions_test_create_product_option_with_duplicate_name_and_value_for_same_product(
  connection: api.IConnection,
) {
  // 1. Create seller
  const sellerEmail =
    RandomGenerator.alphaNumeric(10) + "@test-aimall-e2e.local";
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(8),
          email: sellerEmail,
          contact_phone: "010-" + RandomGenerator.alphaNumeric(8),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create product for this seller
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: categoryId,
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(1),
        description: RandomGenerator.content()()(),
        main_thumbnail_uri: undefined,
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(product);

  // 3. Create initial product option (e.g., name="Color", value="Red")
  const optionName = "Color";
  const optionValue = "Red";
  const option1: IAimallBackendProductOption =
    await api.functional.aimall_backend.seller.products.productOptions.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          name: optionName,
          value: optionValue,
        } satisfies IAimallBackendProductOption.ICreate,
      },
    );
  typia.assert(option1);

  // 4. Attempt to create a duplicate option (should fail)
  await TestValidator.error("duplicate product option creation should fail")(
    async () => {
      await api.functional.aimall_backend.seller.products.productOptions.create(
        connection,
        {
          productId: product.id,
          body: {
            product_id: product.id,
            name: optionName,
            value: optionValue,
          } satisfies IAimallBackendProductOption.ICreate,
        },
      );
    },
  );

  // 5. (Sanity) Create another product owned by the same seller
  const product2: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: categoryId,
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(1) + " 2nd",
        description: RandomGenerator.content()()(),
        main_thumbnail_uri: undefined,
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(product2);

  // Try to create the SAME option for the new product — must succeed
  const option2: IAimallBackendProductOption =
    await api.functional.aimall_backend.seller.products.productOptions.create(
      connection,
      {
        productId: product2.id,
        body: {
          product_id: product2.id,
          name: optionName,
          value: optionValue,
        } satisfies IAimallBackendProductOption.ICreate,
      },
    );
  typia.assert(option2);
}
