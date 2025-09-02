import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import type { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";

export async function test_api_customer_cart_item_addition_success(
  connection: api.IConnection,
) {
  /**
   * E2E test: Customer successfully adds an item to their shopping cart
   *
   * This function covers the full workflow of registering a customer, creating
   * a cart, and adding a new item to the cart using the actual API endpoints.
   * Business rules:
   *
   * - Customer registration is required and handled via /auth/customer/join
   * - Cart creation is required and performed via
   *   /shoppingMallAiBackend/customer/carts
   * - Item is added to the cart via
   *   /shoppingMallAiBackend/customer/carts/{cartId}/items
   *
   * Step-by-step validation:
   *
   * 1. Register a customer (ensuring unique credentials and authentication
   *    context)
   * 2. Create a cart as the authenticated customer
   * 3. Add a valid product snapshot as a cart item (with min quantity, valid
   *    option_code)
   * 4. Confirm response structure, data integrity, and identity linkages
   *    (customer, cart, item)
   */

  // 1. Register customer (get authentication context)
  const customerJoinInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoinInput,
  });
  typia.assert(customerAuth);
  TestValidator.equals(
    "registered customer email matches",
    customerAuth.customer.email,
    customerJoinInput.email,
  );
  TestValidator.equals(
    "registered customer is active",
    customerAuth.customer.is_active,
    true,
  );

  // 2. Create cart for authenticated customer
  const cartCreateInput: IShoppingMallAiBackendCart.ICreate = {
    shopping_mall_ai_backend_customer_id: customerAuth.customer.id,
    cart_token: RandomGenerator.alphaNumeric(24),
    status: "active",
  };
  const cart = await api.functional.shoppingMallAiBackend.customer.carts.create(
    connection,
    {
      body: cartCreateInput,
    },
  );
  typia.assert(cart);
  TestValidator.equals(
    "created cart belongs to registered customer",
    cart.shopping_mall_ai_backend_customer_id,
    customerAuth.customer.id,
  );
  TestValidator.equals(
    "created cart status",
    cart.status,
    cartCreateInput.status,
  );

  // 3. Add item to cart (simulate product snapshot and options)
  const productSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const optionCode = RandomGenerator.alphaNumeric(10);
  const cartItemCreateInput: IShoppingMallAiBackendCartItem.ICreate = {
    shopping_mall_ai_backend_cart_id: cart.id,
    shopping_mall_ai_backend_product_snapshot_id: productSnapshotId,
    quantity: 1,
    option_code: optionCode,
    note: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const cartItem =
    await api.functional.shoppingMallAiBackend.customer.carts.items.create(
      connection,
      {
        cartId: cart.id,
        body: cartItemCreateInput,
      },
    );
  typia.assert(cartItem);
  TestValidator.equals(
    "cart item's cart id matches",
    cartItem.shopping_mall_ai_backend_cart_id,
    cart.id,
  );
  TestValidator.equals(
    "cart item's product snapshot id matches",
    cartItem.shopping_mall_ai_backend_product_snapshot_id,
    productSnapshotId,
  );
  TestValidator.equals(
    "cart item quantity matches",
    cartItem.quantity,
    cartItemCreateInput.quantity,
  );
  TestValidator.equals(
    "cart item option_code matches",
    cartItem.option_code,
    optionCode,
  );
  TestValidator.equals(
    "cart item note matches",
    cartItem.note,
    cartItemCreateInput.note,
  );
}
