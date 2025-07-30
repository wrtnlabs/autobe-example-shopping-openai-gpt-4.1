import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProductOption";

/**
 * Validate uniqueness constraint on product option name within a product.
 *
 * This test ensures that updating a product option to a name already used by
 * another option under the same product triggers a uniqueness violation.
 *
 * Step-by-step process:
 *
 * 1. Create a new seller (to own the product).
 * 2. Create a product attached to that seller (must specify the required category,
 *    seller, title, and status).
 * 3. Create two product options for that product with distinct names and values.
 * 4. Attempt to update the second product option's name to match the first
 *    option's name (while keeping its value unique).
 * 5. Expect the API to reject the update request (should return a uniqueness
 *    violation/business rule error).
 *
 * Business rationale: Product options (e.g., 'Color', 'Size') must each have
 * unique names per product; duplicating an option name for the same product is
 * not allowed. This test verifies that a name collision during update is
 * correctly rejected and does not change data.
 */
export async function test_api_aimall_backend_administrator_products_productOptions_test_update_product_option_to_duplicate_name_for_product(
  connection: api.IConnection,
) {
  // 1. Create a seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(8),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Create a product
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(2),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Create two distinct product options for the product
  const option1 =
    await api.functional.aimall_backend.administrator.products.productOptions.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          name: "Color",
          value: "Red",
        } satisfies IAimallBackendProductOption.ICreate,
      },
    );
  typia.assert(option1);

  const option2 =
    await api.functional.aimall_backend.administrator.products.productOptions.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          name: "Size",
          value: "Medium",
        } satisfies IAimallBackendProductOption.ICreate,
      },
    );
  typia.assert(option2);

  // 4. Attempt to update the second product option's name to match the first option's name,
  // expecting a uniqueness error from the API.
  await TestValidator.error(
    "should fail when updating to duplicate option name for the same product",
  )(async () => {
    await api.functional.aimall_backend.administrator.products.productOptions.update(
      connection,
      {
        productId: product.id,
        productOptionId: option2.id,
        body: {
          name: option1.name, // "Color"
        } satisfies IAimallBackendProductOption.IUpdate,
      },
    );
  });
}
