import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductOptions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductOptions";

export async function test_api_seller_product_option_delete_success(
  connection: api.IConnection,
) {
  /**
   * E2E test: Seller successfully soft deletes their product option group.
   *
   * Steps:
   *
   * 1. Register a new seller and obtain authentication (POST /auth/seller/join).
   * 2. Create a product for this seller (POST
   *    /shoppingMallAiBackend/seller/products).
   * 3. Create an option group for that product (POST
   *    /shoppingMallAiBackend/seller/products/{productId}/options).
   * 4. Delete the created option group using the target API (DELETE
   *    /shoppingMallAiBackend/seller/products/{productId}/options/{optionId}).
   * 5. Verify auditability and logical deletion: (re-fetch the product option
   *    group using the same ID, if such API exists; if not, validate by
   *    comparing deleted_at before/after and trusting the API contract or test
   *    double).
   *
   * Validation:
   *
   * - The erase API returns successfully (void, no error thrown)
   * - The deleted option group has "deleted_at" set after delete.
   *
   * Prerequisites:
   *
   * - Seller must be authenticated.
   * - Product and option group must be uniquely created for this test.
   */

  // 1. Seller registration
  const sellerInfo: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const authResult = await api.functional.auth.seller.join(connection, {
    body: sellerInfo,
  });
  typia.assert(authResult);

  // 2. Product creation
  const productInput: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.name(),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({ paragraphs: 2 }),
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
      { body: productInput },
    );
  typia.assert(product);

  // 3. Option group creation
  const optionInput: IShoppingMallAiBackendProductOptions.ICreate = {
    option_name: RandomGenerator.name(1),
    required: true,
    sort_order: 1,
  };
  const option =
    await api.functional.shoppingMallAiBackend.seller.products.options.create(
      connection,
      {
        productId: product.id,
        body: optionInput,
      },
    );
  typia.assert(option);
  TestValidator.equals(
    "option group initially not deleted",
    option.deleted_at,
    null,
  );

  // 4. Delete option group (soft delete)
  await api.functional.shoppingMallAiBackend.seller.products.options.erase(
    connection,
    {
      productId: product.id,
      optionId: option.id,
    },
  );

  // 5. Confirm logical deletion: we cannot re-fetch by ID with current API exposure, so we check void return and prior assertion.
  // If a GET (detail) API is available, could verify deleted_at field is now set (and type is string/date-time). For now, rely on contract.
}
