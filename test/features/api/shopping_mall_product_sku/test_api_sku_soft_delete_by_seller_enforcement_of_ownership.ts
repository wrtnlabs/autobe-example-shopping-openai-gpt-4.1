import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Ensure that a seller cannot soft-delete a SKU under a product they do not
 * own.
 *
 * 1. Register Seller A and assign them the SELLER role (admin creates role), then
 *    create category, product, and SKU for Seller A
 * 2. Register Seller B, a fully separate seller (no account switching)
 * 3. Seller B attempts to delete Seller A's SKU
 * 4. The system must prohibit the unauthorized soft-delete attempt. Assert correct
 *    error behavior
 */
export async function test_api_sku_soft_delete_by_seller_enforcement_of_ownership(
  connection: api.IConnection,
) {
  // 1. Seller A registration and data setup
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerARegNum = RandomGenerator.alphaNumeric(8);
  const sellerA: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerAEmail,
        password: "Password1!",
        business_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(1),
        phone: RandomGenerator.mobile(),
        business_registration_number: sellerARegNum,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(sellerA);

  // 1a. Ensure SELLER role exists (admin)
  const role: IShoppingMallRole =
    await api.functional.shoppingMall.admin.roles.create(connection, {
      body: {
        role_name: "SELLER",
        description: "Can manage their own products and SKUs",
      } satisfies IShoppingMallRole.ICreate,
    });
  typia.assert(role);

  // 1b. Category creation (admin)
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.paragraph({ sentences: 2 }),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 1c. Seller A creates a product
  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: sellerA.id,
        shopping_mall_category_id: category.id,
        name: "Seller A Test Product " + RandomGenerator.name(1),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(productA);

  // 1d. Seller A creates a SKU for their product
  const skuA: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: productA.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(8),
        name: "Test SKU A",
        price: 1000,
        status: "active",
      } satisfies IShoppingMallProductSku.ICreate,
    });
  typia.assert(skuA);

  // 2. Seller B registration (separate user context)
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBRegNum = RandomGenerator.alphaNumeric(8);
  // Fresh connection for Seller B
  const sellerBConn: api.IConnection = { ...connection, headers: {} };
  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(sellerBConn, {
      body: {
        email: sellerBEmail,
        password: "Password1!",
        business_name: RandomGenerator.name(),
        contact_name: RandomGenerator.name(1),
        phone: RandomGenerator.mobile(),
        business_registration_number: sellerBRegNum,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(sellerB);

  // 3. Seller B attempts to soft-delete Seller A's SKU
  await TestValidator.error(
    "seller B cannot delete SKU belonging to another seller",
    async () => {
      await api.functional.shoppingMall.seller.products.skus.erase(
        sellerBConn,
        {
          productId: productA.id,
          skuId: skuA.id,
        },
      );
    },
  );
}
