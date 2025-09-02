import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";
import type { IShoppingMallAiBackendProductFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductFile";

/**
 * Test that updating a product file with invalid input fails as expected by
 * backend validation.
 *
 * Steps:
 *
 * 1. Register a new seller
 * 2. Register a product as the seller
 * 3. Attach a file to the product
 * 4. Attempt product file metadata update with display_order set to a negative
 *    number (expected to fail)
 * 5. Attempt update with illegal file_type value (e.g., empty string)
 *    (expected to fail)
 * 6. Attempt update with empty body (missing required metadata) (expected to
 *    fail)
 * 7. For each invalid update, verify the API call results in a validation
 *    error (ensures backend defends data integrity)
 */
export async function test_api_product_file_update_validation_failure(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerInput = {
    email: `${RandomGenerator.alphabets(10)}@autotest.com`,
    business_registration_number: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAiBackendSeller.ICreate;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);

  // 2. Register product
  const productInput = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(10),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    product_type: RandomGenerator.name(1),
    business_status: "active",
    min_order_quantity: 1,
    max_order_quantity: 100,
    tax_code: RandomGenerator.alphaNumeric(5),
    sort_priority: 0,
  } satisfies IShoppingMallAiBackendProduct.ICreate;
  const product =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      {
        body: productInput,
      },
    );
  typia.assert(product);

  // 3. Attach file
  const productFileInput = {
    shopping_mall_ai_backend_products_id: product.id,
    file_uri: `https://cdn.autotest.com/${RandomGenerator.alphaNumeric(16)}.jpg`,
    file_type: "image/jpeg",
    display_order: 0,
    is_primary: true,
  } satisfies IShoppingMallAiBackendProductFile.ICreate;
  const productFile =
    await api.functional.shoppingMallAiBackend.seller.products.files.create(
      connection,
      {
        productId: product.id,
        body: productFileInput,
      },
    );
  typia.assert(productFile);

  // 4. Invalid update: negative display_order
  await TestValidator.error(
    "update fails with negative display_order",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.files.update(
        connection,
        {
          productId: product.id,
          fileId: productFile.id,
          body: {
            display_order: -1,
          } satisfies IShoppingMallAiBackendProductFile.IUpdate,
        },
      );
    },
  );

  // 5. Invalid update: illegal file_type (empty string)
  await TestValidator.error(
    "update fails with illegal file_type (empty string)",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.files.update(
        connection,
        {
          productId: product.id,
          fileId: productFile.id,
          body: {
            file_type: "",
          } satisfies IShoppingMallAiBackendProductFile.IUpdate,
        },
      );
    },
  );

  // 6. Invalid update: empty body (missing metadata)
  await TestValidator.error(
    "update fails with empty update body (missing metadata)",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.files.update(
        connection,
        {
          productId: product.id,
          fileId: productFile.id,
          body: {} satisfies IShoppingMallAiBackendProductFile.IUpdate,
        },
      );
    },
  );
}
