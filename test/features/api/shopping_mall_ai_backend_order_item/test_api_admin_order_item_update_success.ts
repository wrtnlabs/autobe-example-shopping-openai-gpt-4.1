import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IShoppingMallAiBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderItem";

export async function test_api_admin_order_item_update_success(
  connection: api.IConnection,
) {
  /**
   * E2E: Admin updates an order item.
   *
   * 1. Register an admin; retain credentials for login role switching
   * 2. Register a customer for this test
   * 3. Customer creates a basic order
   * 4. Prepare a simulated order item for the update (using typia.random for
   *    item/product IDs as there is no creation/list API for order items)
   * 5. Switch to admin role
   * 6. Admin updates mutable business fields of this order item via PUT
   * 7. Validate that all updated fields reflect correctly, audit info is changed,
   *    and business logic is preserved
   */

  // 1. Register an admin and store credentials
  const adminUsername = RandomGenerator.alphaNumeric(8);
  const adminEmail = `${RandomGenerator.alphaNumeric(6)}@malladmin.com`;
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const adminRegister = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword, // For testing, use cleartext for hash (test only, do not use in production!)
      name: RandomGenerator.name(),
      email: adminEmail as string & tags.Format<"email">,
      is_active: true,
      phone_number: RandomGenerator.mobile(),
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminRegister);

  // 2. Register a customer
  const customerEmail =
    `${RandomGenerator.alphaNumeric(8)}@customertest.com` as string &
      tags.Format<"email">;
  const customerPassword = RandomGenerator.alphaNumeric(10) as string &
    tags.Format<"password">;
  const customerRegister = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: RandomGenerator.mobile(),
      password: customerPassword,
      name: RandomGenerator.name(),
      nickname: RandomGenerator.name(1),
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerRegister);

  // 3. Customer creates an order
  const orderCreate =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerRegister.customer.id,
          shopping_mall_ai_backend_channel_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          code: RandomGenerator.alphaNumeric(12),
          status: "pending",
          total_amount: 100000,
          currency: "KRW",
          ordered_at: new Date().toISOString(),
        } satisfies IShoppingMallAiBackendOrder.ICreate,
      },
    );
  typia.assert(orderCreate);

  // 4. Prepare a simulated order item for admin update. In real business, this should come from an order's list of items, but for this test, we generate IDs directly
  const orderItemId = typia.random<string & tags.Format<"uuid">>();

  // 5. Switch to admin role (login)
  await api.functional.auth.admin.login(connection, {
    body: {
      username: adminUsername,
      password: adminPassword,
    } satisfies IShoppingMallAiBackendAdmin.ILogin,
  });

  // 6. Admin updates the order item (simulate PUT) with new values
  const updatedQuantity = 3; // arbitrary change from default
  const updatedDiscount = 7500;
  const updatedFinalAmount = 92500;
  const updatedStatus = "approved";
  const updatedAt = new Date().toISOString();
  const updatedItem =
    await api.functional.shoppingMallAiBackend.admin.orders.items.update(
      connection,
      {
        orderId: orderCreate.id,
        itemId: orderItemId,
        body: {
          quantity: updatedQuantity,
          discount_amount: updatedDiscount,
          final_amount: updatedFinalAmount,
          status: updatedStatus,
          updated_at: updatedAt,
        } satisfies IShoppingMallAiBackendOrderItem.IUpdate,
      },
    );
  typia.assert(updatedItem);

  // 7. Validate updated fields and audit information
  TestValidator.equals(
    "order item quantity updated",
    updatedItem.quantity,
    updatedQuantity,
  );
  TestValidator.equals(
    "order item discount updated",
    updatedItem.discount_amount,
    updatedDiscount,
  );
  TestValidator.equals(
    "order item final amount updated",
    updatedItem.final_amount,
    updatedFinalAmount,
  );
  TestValidator.equals(
    "order item status updated",
    updatedItem.status,
    updatedStatus,
  );
  TestValidator.equals(
    "order item audit updated_at",
    updatedItem.updated_at,
    updatedAt,
  );
}
