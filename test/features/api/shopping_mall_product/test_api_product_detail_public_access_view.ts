import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";

/**
 * Validate public product detail viewing after creation and publishing.
 *
 * This test ensures:
 *
 * 1. An admin creates a category.
 * 2. An admin creates a SELLER role (to associate with the product's seller,
 *    though the seller creation process is out-of-scope for exposed APIs).
 * 3. A seller product is created, active, and accessible via its productId to the
 *    public with all required detail fields present.
 * 4. Requests for an unpublished, deleted, or random (invalid) productId result in
 *    not-found responses (error handled).
 * 5. Product detail visibility follows is_active status rules.
 */
export async function test_api_product_detail_public_access_view(
  connection: api.IConnection,
) {
  // 1. Create new category (required for valid product)
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        name_en: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 2. Create SELLER role
  const role = await api.functional.shoppingMall.admin.roles.create(
    connection,
    {
      body: {
        role_name: "SELLER",
        description: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 10,
        }),
      } satisfies IShoppingMallRole.ICreate,
    },
  );
  typia.assert(role);

  // 3. Create a product published by a seller (simulate seller UUID)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const productInput = {
    shopping_mall_seller_id: sellerId,
    shopping_mall_category_id: category.id,
    name: RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 10 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 10,
    }),
    is_active: true,
    main_image_url:
      "https://picsum.photos/seed/" +
      RandomGenerator.alphaNumeric(8) +
      "/400/400",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 4. Retrieve product detail publicly (by productId)
  const detail = await api.functional.shoppingMall.products.at(connection, {
    productId: product.id,
  });
  typia.assert(detail);
  // Validate critical fields
  TestValidator.equals("product id matches", detail.id, product.id);
  TestValidator.equals("product is active", detail.is_active, true);
  TestValidator.equals(
    "main image url matches",
    detail.main_image_url,
    product.main_image_url,
  );

  // 5. Try invalid productId (random UUID, not existing)
  await TestValidator.error("not found for random productId", async () => {
    await api.functional.shoppingMall.products.at(connection, {
      productId: typia.random<string & tags.Format<"uuid">>(),
    });
  });

  // 6. Deactivate product, then test visibility
  // There is no explicit product update/delete API in current surface, but we simulate by creating an inactive product
  const inactiveProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        ...productInput,
        is_active: false,
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
      },
    });
  typia.assert(inactiveProduct);
  await TestValidator.error("inactive product is not visible", async () => {
    await api.functional.shoppingMall.products.at(connection, {
      productId: inactiveProduct.id,
    });
  });
}
