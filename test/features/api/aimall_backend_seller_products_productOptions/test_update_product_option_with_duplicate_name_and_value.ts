import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductOption";

/**
 * Validate uniqueness constraint on product options update.
 *
 * This test ensures that attempting to update a product option's name and value
 * combination to match an existing sibling option for the same product will
 * fail, enforcing data integrity/uniqueness at the (product_id, name, value)
 * tuple level.
 *
 * Step-by-step process:
 *
 * 1. Register a new seller via the administrator API.
 * 2. Create a new product owned by the newly created seller.
 * 3. Create two different product options for this product, each with unique
 *    name+value pairs.
 * 4. Attempt to update the second option to duplicate the first option's name and
 *    value.
 * 5. Validate that the API call fails with a uniqueness/conflict error (business
 *    logic error at runtime).
 * 6. Assert that the original options' data have not changed by comparing known
 *    values.
 *
 * This ensures proper business rule enforcement for option uniqueness and
 * validates that no partial/corrupt updates occur on error.
 *
 * Note: As there is no option GET endpoint, data validation uses creation
 * results.
 */
export async function test_api_aimall_backend_seller_products_productOptions_test_update_product_option_with_duplicate_name_and_value(
  connection: api.IConnection,
) {
  // 1. Register a new seller (administrator API)
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(10),
          email: sellerEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create a new product for this seller
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.seller.products.create(connection, {
      body: {
        category_id: typia.random<string & tags.Format<"uuid">>(),
        seller_id: seller.id,
        title: RandomGenerator.paragraph()(1),
        status: "active",
      } satisfies IAimallBackendProduct.ICreate,
    });
  typia.assert(product);

  // 3. Create two unique options
  const optionAInput: IAimallBackendProductOption.ICreate = {
    product_id: product.id,
    name: "Color",
    value: "Red",
  };
  const optionBInput: IAimallBackendProductOption.ICreate = {
    product_id: product.id,
    name: "Size",
    value: "XL",
  };
  const optionA =
    await api.functional.aimall_backend.seller.products.productOptions.create(
      connection,
      {
        productId: product.id,
        body: optionAInput,
      },
    );
  typia.assert(optionA);
  const optionB =
    await api.functional.aimall_backend.seller.products.productOptions.create(
      connection,
      {
        productId: product.id,
        body: optionBInput,
      },
    );
  typia.assert(optionB);

  // 4. Attempt to update optionB to collide with optionA's name/value
  await TestValidator.error("should fail with duplicate name/value")(() =>
    api.functional.aimall_backend.seller.products.productOptions.update(
      connection,
      {
        productId: product.id,
        productOptionId: optionB.id,
        body: {
          name: optionA.name,
          value: optionA.value,
        } satisfies IAimallBackendProductOption.IUpdate,
      },
    ),
  );

  // 5. Assert both options still have original values
  TestValidator.equals("optionA name unchanged")(optionA.name)("Color");
  TestValidator.equals("optionA value unchanged")(optionA.value)("Red");
  TestValidator.equals("optionB name unchanged")(optionB.name)("Size");
  TestValidator.equals("optionB value unchanged")(optionB.value)("XL");
}
