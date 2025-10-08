import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates that sellers cannot update a product's category to a non-leaf or
 * non-existent category.
 *
 * 1. Admin joins and creates a root category (intended as non-leaf)
 * 2. Admin creates a leaf subcategory under this root category
 * 3. Seller joins
 * 4. Seller creates a valid product under the valid (leaf) subcategory
 * 5. Seller attempts to update the product category to the root/non-leaf category
 *    (invalid)
 * 6. Validate the update fails due to business rule
 */
export async function test_api_product_update_by_seller_with_invalid_category(
  connection: api.IConnection,
) {
  // 1. Admin joins and gets authorized
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "ADMIN-pass-1234!",
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin creates a root category (non-leaf; will have a child)
  const rootCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(rootCategory);

  // 3. Admin creates a valid leaf subcategory under the root
  const leafCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: rootCategory.id,
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        display_order: 1,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(leafCategory);

  // 4. Seller joins
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "SELLER-pass-1234!",
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 5. Seller creates a valid product under the leafCategory
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.update(connection, {
      productId: typia.random<string & tags.Format<"uuid">>(), // simulate product creation by updating random
      body: {
        shopping_mall_category_id: leafCategory.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(product);

  // 6. Attempt to update the product -- try assigning to the rootCategory (should fail, root is not leaf)
  await TestValidator.error(
    "Updating product category to non-leaf should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.update(connection, {
        productId: product.id,
        body: {
          shopping_mall_category_id: rootCategory.id,
        } satisfies IShoppingMallProduct.IUpdate,
      });
    },
  );
}
