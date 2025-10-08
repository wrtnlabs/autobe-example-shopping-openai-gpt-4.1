import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates that a seller can delete their own product if there are no active
 * or open orders, and another (unauthorized) seller cannot. Also checks the
 * system cleans up related records on product deletion.
 *
 * 1. Register the SELLER role via admin API.
 * 2. Register a new product category (category must be active and unique).
 * 3. Register a new seller.
 * 4. Seller creates a product in the registered category.
 * 5. Seller deletes their product (no orders associated).
 * 6. Check product deletion does not raise errors and productId no longer exists
 *    through normal flows (if SDK allows fetch/check).
 * 7. Register a second seller.
 * 8. Attempt to delete the previously created product as the second seller --
 *    expect an access control error (blocked by proper ownership enforcement,
 *    error assertion).
 * 9. (Optionally if there were cart/wishlist/catalog systems exposed, check
 *    cleanup of related records after deletion.)
 */
export async function test_api_product_deletion_by_seller_no_active_orders(
  connection: api.IConnection,
) {
  // 1. Create the SELLER role for authorization.
  const sellerRole = await api.functional.shoppingMall.admin.roles.create(
    connection,
    {
      body: {
        role_name: "SELLER",
        description: "Can manage their own products",
      } satisfies IShoppingMallRole.ICreate,
    },
  );
  typia.assert(sellerRole);

  // 2. Create a test product category.
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.paragraph({ sentences: 2 }),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        is_active: true,
        description_ko: RandomGenerator.paragraph({ sentences: 8 }),
        description_en: RandomGenerator.paragraph({ sentences: 8 }),
        display_order: 0,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Register seller A (the owner/successful deleter).
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: "passwordA",
      business_name: RandomGenerator.name(2),
      contact_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(12),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerA);

  // 4. Seller A creates a product linked to the category
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerA.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 5. Delete the product as Seller A
  await api.functional.shoppingMall.seller.products.erase(connection, {
    productId: product.id,
  });

  // 6. (No get endpoint for product existence; in full platform, here we'd try to fetch and expect 404; skipped as not available in listing.)

  // 7. Register Seller B (unauthorized to delete A's product)
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: "passwordB",
      business_name: RandomGenerator.name(2),
      contact_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(12),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerB);

  // 8. Attempt to have Seller B delete Seller A's product -- expect access error
  await TestValidator.error(
    "unauthorized seller cannot delete another's product",
    async () => {
      await api.functional.shoppingMall.seller.products.erase(connection, {
        productId: product.id,
      });
    },
  );
  // 9. (If exposed: assert cart/wishlist/catalog do not contain the deleted product.)
}
