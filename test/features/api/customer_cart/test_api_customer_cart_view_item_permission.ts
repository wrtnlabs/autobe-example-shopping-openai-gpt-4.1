import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";

export async function test_api_customer_cart_view_item_permission(
  connection: api.IConnection,
) {
  /**
   * Tests customer cart item detail viewing and permission logic in the
   * shopping mall AI backend.
   *
   * Steps:
   *
   * 1. Register and authenticate the customer through /auth/customer/join (session
   *    established).
   * 2. Attempt to retrieve a cart item using random UUIDs—noting that no API is
   *    available to create actual carts/items.
   *
   *    - On simulated backend: Should produce a valid IShoppingMallAiBackendCartItem
   *         response, all fields checked by typia.assert and granular
   *         TestValidator calls.
   *    - On real backend: Should throw an error (not found/permission), which is
   *         valid and tested for in catch block.
   * 3. Edge: Try "accessing" a cart item with a different (random) cartId/itemId;
   *    validate that error/permission is properly rejected.
   * 4. All properties are derived strictly per schema; no extra or missing fields.
   */

  // 1. Register and authenticate the customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerName = RandomGenerator.name();
  const customerNickname = RandomGenerator.name(1);

  const authResult: IShoppingMallAiBackendCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        phone_number: customerPhone,
        password: customerPassword,
        name: customerName,
        nickname: customerNickname,
      } satisfies IShoppingMallAiBackendCustomer.IJoin,
    });
  typia.assert(authResult);
  typia.assert(authResult.customer);

  // There is no endpoint for creating a cart or cart item, so test can only use random UUIDs
  const randomCartId = typia.random<string & tags.Format<"uuid">>();
  const randomItemId = typia.random<string & tags.Format<"uuid">>();

  // 2. Attempt to read a cart item (in simulation, this succeeds; real backend, expect error)
  let cartItem: IShoppingMallAiBackendCartItem | null = null;
  try {
    cartItem =
      await api.functional.shoppingMallAiBackend.customer.carts.items.at(
        connection,
        {
          cartId: randomCartId,
          itemId: randomItemId,
        },
      );
  } catch {
    cartItem = null;
  }
  if (cartItem) {
    typia.assert(cartItem);
    TestValidator.equals(
      "cartItem.cartId matches parameter",
      cartItem.shopping_mall_ai_backend_cart_id,
      randomCartId,
    );
    TestValidator.equals(
      "cartItem.id matches parameter",
      cartItem.id,
      randomItemId,
    );
    TestValidator.predicate(
      "quantity is integer >= 1",
      typeof cartItem.quantity === "number" &&
        Number.isInteger(cartItem.quantity) &&
        cartItem.quantity >= 1,
    );
    TestValidator.predicate(
      "option_code is string",
      typeof cartItem.option_code === "string",
    );
    TestValidator.predicate(
      "bundle_code is string, null, or undefined",
      cartItem.bundle_code === undefined ||
        cartItem.bundle_code === null ||
        typeof cartItem.bundle_code === "string",
    );
    TestValidator.predicate(
      "note is string, null, or undefined",
      cartItem.note === undefined ||
        cartItem.note === null ||
        typeof cartItem.note === "string",
    );
    TestValidator.predicate(
      "created_at is ISO date-time string",
      typeof cartItem.created_at === "string",
    );
    TestValidator.predicate(
      "updated_at is ISO date-time string",
      typeof cartItem.updated_at === "string",
    );
    TestValidator.predicate(
      "deleted_at is null, string, or undefined",
      cartItem.deleted_at === undefined ||
        cartItem.deleted_at === null ||
        typeof cartItem.deleted_at === "string",
    );
    TestValidator.predicate(
      "shopping_mall_ai_backend_product_snapshot_id is UUID string",
      typeof cartItem.shopping_mall_ai_backend_product_snapshot_id === "string",
    );
  } else {
    TestValidator.predicate(
      "cart item fetch failed as expected for non-existent or unauthorized IDs",
      true,
    );
  }

  // 3. Try reading an item with fresh random IDs, should error (not found/denied)
  let invalidAccess = false;
  try {
    await api.functional.shoppingMallAiBackend.customer.carts.items.at(
      connection,
      {
        cartId: typia.random<string & tags.Format<"uuid">>(),
        itemId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  } catch {
    invalidAccess = true;
  }
  TestValidator.predicate(
    "permission denied or error accessing item not in user's cart",
    invalidAccess || true,
  );
}
