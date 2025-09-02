import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptions";

export async function test_api_seller_product_option_update_success(
  connection: api.IConnection,
) {
  /**
   * Validate that a seller can successfully update an existing product option
   * group.
   *
   * This test ensures that, after a seller is registered and authenticated, and
   * after a product and an associated product option group are created, the
   * seller can update that group using valid data. The function verifies that
   * the details of the product option are updated as expected, and that the
   * updated_at timestamp is modified.
   *
   * Steps:
   *
   * 1. Register the seller and authenticate context.
   * 2. Create a product.
   * 3. Create a product option group.
   * 4. Update the product option group with new data.
   * 5. Validate the returned object reflects the updates, and updated_at differs
   *    from the original value.
   */

  // 1. Register seller and authenticate context
  const sellerData: IShoppingMallAiBackendSeller.ICreate = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerData,
  });
  typia.assert(sellerAuth);

  // 2. Create a product
  const productData: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 12 }),
    slug: `${RandomGenerator.alphaNumeric(8)}-product`,
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 12,
    }),
    product_type: RandomGenerator.pick(["physical", "digital"] as const),
    business_status: RandomGenerator.pick([
      "draft",
      "active",
      "paused",
    ] as const),
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 1,
  };
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productData },
    );
  typia.assert(product);

  // 3. Create a product option group
  const optionGroupCreate: IShoppingMallAiBackendProductOptions.ICreate = {
    option_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 8,
    }),
    required: true,
    sort_order: 1,
  };
  const optionGroup =
    await api.functional.shoppingMallAiBackend.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: optionGroupCreate,
      },
    );
  typia.assert(optionGroup);

  // 4. Prepare update input for the option group
  const updateInput: IShoppingMallAiBackendProductOptions.IUpdate = {
    option_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 6,
      wordMax: 12,
    }),
    required: false,
    sort_order: 2,
  };
  const beforeUpdateAt = optionGroup.updated_at;

  // 5. Update the option group
  const updatedOptionGroup =
    await api.functional.shoppingMallAiBackend.seller.products.options.update(
      connection,
      {
        productId: product.id,
        optionId: optionGroup.id,
        body: updateInput,
      },
    );
  typia.assert(updatedOptionGroup);

  // 6. Assertions: updated fields are changed and updated_at is modified
  TestValidator.equals(
    "option_name updated",
    updatedOptionGroup.option_name,
    updateInput.option_name,
  );
  TestValidator.equals(
    "required updated",
    updatedOptionGroup.required,
    updateInput.required,
  );
  TestValidator.equals(
    "sort_order updated",
    updatedOptionGroup.sort_order,
    updateInput.sort_order,
  );
  TestValidator.notEquals(
    "updated_at should be changed after update",
    updatedOptionGroup.updated_at,
    beforeUpdateAt,
  );
}
