import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProduct";

/**
 * E2E test for seller product update API, validating successful update as
 * product owner and failure (forbidden/not found) when attempting to update
 * as unauthorized user or with invalid productId.
 *
 * Business flow:
 *
 * 1. Register seller1 (owner), join and establish session.
 * 2. Create product as seller1 (obtain productId).
 * 3. Update the product with all relevant mutable fields and verify update.
 * 4. Register seller2, join and establish session.
 * 5. Attempt to update seller1's product as seller2, validate error.
 * 6. Attempt to update a random non-existent productId, validate error.
 *
 * All flows use proper authentication via join, and assertions are
 * performed on updated product data and error cases using TestValidator
 * utilities.
 */
export async function test_api_seller_product_update_success_and_ownership_failure(
  connection: api.IConnection,
) {
  // 1. Register the first seller (owner)
  const seller1Input: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const seller1Auth = await api.functional.auth.seller.join(connection, {
    body: seller1Input,
  });
  typia.assert(seller1Auth);
  const seller1 = seller1Auth.seller;

  // 2. Create product as seller1
  const productCreate: IShoppingMallAiBackendProduct.ICreate = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    product_type: RandomGenerator.pick([
      "physical",
      "digital",
      "service",
    ] as const),
    business_status: RandomGenerator.pick([
      "draft",
      "active",
      "paused",
    ] as const),
    min_order_quantity: 1,
    max_order_quantity: 10,
    tax_code: RandomGenerator.alphaNumeric(5),
    sort_priority: 10,
  };
  const createdProduct =
    await api.functional.shoppingMallAiBackend.seller.products.create(
      connection,
      { body: productCreate },
    );
  typia.assert(createdProduct);

  // 3. Update product as the owner
  const updateBody: IShoppingMallAiBackendProduct.IUpdate = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    product_type: RandomGenerator.pick([
      "physical",
      "digital",
      "service",
    ] as const),
    business_status: RandomGenerator.pick([
      "active",
      "paused",
      "draft",
    ] as const),
    slug: RandomGenerator.alphaNumeric(15),
    min_order_quantity: 2,
    max_order_quantity: 20,
    tax_code: RandomGenerator.alphaNumeric(6),
    sort_priority: 20,
  };
  const updatedProduct =
    await api.functional.shoppingMallAiBackend.seller.products.update(
      connection,
      {
        productId: createdProduct.id,
        body: updateBody,
      },
    );
  typia.assert(updatedProduct);
  TestValidator.equals(
    "Updated product title",
    updatedProduct.title,
    updateBody.title,
  );
  TestValidator.equals(
    "Updated product description",
    updatedProduct.description,
    updateBody.description,
  );
  TestValidator.equals(
    "Updated product type",
    updatedProduct.product_type,
    updateBody.product_type,
  );
  TestValidator.equals(
    "Updated product status",
    updatedProduct.business_status,
    updateBody.business_status,
  );
  TestValidator.equals("Updated slug", updatedProduct.slug, updateBody.slug);
  TestValidator.equals(
    "Updated min order quantity",
    updatedProduct.min_order_quantity,
    updateBody.min_order_quantity,
  );
  TestValidator.equals(
    "Updated max order quantity",
    updatedProduct.max_order_quantity,
    updateBody.max_order_quantity,
  );
  TestValidator.equals(
    "Updated tax code",
    updatedProduct.tax_code,
    updateBody.tax_code,
  );
  TestValidator.equals(
    "Updated sort priority",
    updatedProduct.sort_priority,
    updateBody.sort_priority,
  );

  // 4. Register the second seller (to simulate forbidden/unauthorized case)
  const seller2Input: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const seller2Auth = await api.functional.auth.seller.join(connection, {
    body: seller2Input,
  });
  typia.assert(seller2Auth);

  // 5. Ownership failure - forbidden: seller2 tries updating seller1's product
  await TestValidator.error(
    "Seller (not owner) cannot update product",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.update(
        connection,
        {
          productId: createdProduct.id,
          body: {
            title: RandomGenerator.paragraph({ sentences: 4 }),
          },
        },
      );
    },
  );

  // 6. Not found: update a random (nonexistent) UUID
  await TestValidator.error(
    "Update with non-existent productId should fail",
    async () => {
      await api.functional.shoppingMallAiBackend.seller.products.update(
        connection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            title: RandomGenerator.paragraph({ sentences: 4 }),
          },
        },
      );
    },
  );
}
