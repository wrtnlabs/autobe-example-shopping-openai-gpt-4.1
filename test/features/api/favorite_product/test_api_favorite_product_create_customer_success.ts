import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallFavoriteProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFavoriteProduct";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";

/**
 * Verifies that a customer can favorite a product and that constraints are
 * enforced.
 *
 * Steps:
 *
 * 1. Register a new customer (join).
 * 2. Register a product as a seller (simulate seller action, no auth needed here).
 * 3. Favorite the product as the customer (must succeed, verify fields).
 * 4. Attempt to favorite again - expect error (uniqueness).
 * 5. Attempt to favorite a non-existent product - expect error.
 */
export async function test_api_favorite_product_create_customer_success(
  connection: api.IConnection,
) {
  // 1. Register a customer.
  const customerChannelId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const customerJoin = {
    shopping_mall_channel_id: customerChannelId,
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, { body: customerJoin });
  typia.assert(customer);
  TestValidator.equals(
    "joined customer email matches",
    customer.email,
    customerEmail,
  );

  // 2. Register a product.
  const productCreate = {
    shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_channel_id: customerChannelId,
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_category_id: typia.random<string & tags.Format<"uuid">>(),
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "Active",
    business_status: "Approval",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreate,
    });
  typia.assert(product);
  TestValidator.equals(
    "created product code matches",
    product.code,
    productCreate.code,
  );

  // 3. Favorite the product.
  const favoriteCreate = {
    shopping_mall_product_id: product.id,
    shopping_mall_favorite_snapshot_id: typia.random<
      string & tags.Format<"uuid">
    >(), // Normally, would need to be the proper snapshot of product but for the test's purpose just a valid UUID.
    notification_enabled: true,
    batch_label: null,
  } satisfies IShoppingMallFavoriteProduct.ICreate;
  const favorite: IShoppingMallFavoriteProduct =
    await api.functional.shoppingMall.customer.favoriteProducts.create(
      connection,
      { body: favoriteCreate },
    );
  typia.assert(favorite);
  TestValidator.equals(
    "favorite product linkage correct",
    favorite.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "favorite customer linkage correct",
    favorite.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "notification is enabled",
    favorite.notification_enabled,
    true,
  );

  // 4. Attempt to favorite again (should error - uniqueness constraint):
  await TestValidator.error("should not allow duplicate favorite", async () => {
    await api.functional.shoppingMall.customer.favoriteProducts.create(
      connection,
      { body: favoriteCreate },
    );
  });

  // 5. Attempt to favorite a non-existent product.
  const nonExistentFavorite = {
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_favorite_snapshot_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    notification_enabled: false,
    batch_label: null,
  } satisfies IShoppingMallFavoriteProduct.ICreate;
  await TestValidator.error(
    "should error when favoriting non-existent product",
    async () => {
      await api.functional.shoppingMall.customer.favoriteProducts.create(
        connection,
        { body: nonExistentFavorite },
      );
    },
  );
}
