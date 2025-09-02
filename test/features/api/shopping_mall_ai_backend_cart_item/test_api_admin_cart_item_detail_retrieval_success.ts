import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import type { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";

export async function test_api_admin_cart_item_detail_retrieval_success(
  connection: api.IConnection,
) {
  /**
   * Test successful retrieval of cart item details by an admin user.
   *
   * This scenario ensures that an admin can retrieve the details of a cart item
   * created by a customer. The workflow is:
   *
   * 1. Register a new admin user and authenticate as admin.
   * 2. Register a new customer and authenticate as customer.
   * 3. Customer creates a shopping cart.
   * 4. Customer adds at least one item to their cart.
   * 5. Switch authentication context to admin.
   * 6. As admin, retrieve the cart item details and validate all expected
   *    properties and audit fields.
   */

  // 1. Register and authenticate admin
  const adminUsername = RandomGenerator.alphabets(8);
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminEmail = `${RandomGenerator.alphabets(6)}@test.com`;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword, // Note: API expects hash; for test, treat as plain.
      name: RandomGenerator.name(),
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminAuth);

  // 2. Register and authenticate customer
  const customerEmail = `${RandomGenerator.alphabets(7)}@test.com`;
  const customerPassword = RandomGenerator.alphaNumeric(10);
  const customerPhone = RandomGenerator.mobile();
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: customerPhone,
      password: customerPassword,
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerAuth);

  // Switch to customer context
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword,
    } satisfies IShoppingMallAiBackendCustomer.ILogin,
  });

  // 3. Customer creates a cart
  const cartToken = RandomGenerator.alphaNumeric(20);
  const customerCart =
    await api.functional.shoppingMallAiBackend.customer.carts.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerAuth.customer.id,
          cart_token: cartToken,
          status: "active",
        } satisfies IShoppingMallAiBackendCart.ICreate,
      },
    );
  typia.assert(customerCart);

  // 4. Customer adds an item to their cart
  const productSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const optionCode = RandomGenerator.alphaNumeric(6);
  const cartItem =
    await api.functional.shoppingMallAiBackend.customer.carts.items.create(
      connection,
      {
        cartId: customerCart.id,
        body: {
          shopping_mall_ai_backend_cart_id: customerCart.id,
          shopping_mall_ai_backend_product_snapshot_id: productSnapshotId,
          quantity: 1,
          option_code: optionCode,
        } satisfies IShoppingMallAiBackendCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 5. Switch back to admin authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      username: adminUsername,
      password: adminPassword,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });

  // 6. As admin, retrieve the cart item details and validate
  const retrievedItem =
    await api.functional.shoppingMallAiBackend.admin.carts.items.at(
      connection,
      {
        cartId: customerCart.id,
        itemId: cartItem.id,
      },
    );
  typia.assert(retrievedItem);

  TestValidator.equals(
    "cartId matches",
    retrievedItem.shopping_mall_ai_backend_cart_id,
    cartItem.shopping_mall_ai_backend_cart_id,
  );
  TestValidator.equals("itemId matches", retrievedItem.id, cartItem.id);
  TestValidator.equals(
    "product snapshot id matches",
    retrievedItem.shopping_mall_ai_backend_product_snapshot_id,
    cartItem.shopping_mall_ai_backend_product_snapshot_id,
  );
  TestValidator.equals(
    "quantity matches",
    retrievedItem.quantity,
    cartItem.quantity,
  );
  TestValidator.equals(
    "option code matches",
    retrievedItem.option_code,
    cartItem.option_code,
  );
  TestValidator.predicate(
    "created_at must be present",
    typeof retrievedItem.created_at === "string" &&
      retrievedItem.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at must be present",
    typeof retrievedItem.updated_at === "string" &&
      retrievedItem.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at must be null on non-deleted item",
    retrievedItem.deleted_at,
    null,
  );
}
