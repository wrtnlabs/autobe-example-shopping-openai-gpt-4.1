import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendAdmin";
import type { IShoppingMallAiBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrder";
import type { IShoppingMallAiBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendOrderItem";

export async function test_api_admin_order_item_update_unauthorized_failure(
  connection: api.IConnection,
) {
  /**
   * Validates that attempts to update an order item via the admin endpoint fail
   * if the caller is either unauthenticated or only authenticated as a customer
   * (non-admin).
   *
   * 1. Register a customer and login (sets up baseline user session and customer
   *    context)
   * 2. Register a second customer (for multi-actor simulation; not strictly
   *    required but kept for actor boundary completeness)
   * 3. Register an admin; capture credentials (needed for item creation support
   *    and for potential logic switching)
   * 4. Customer creates an order (using customer authentication token; will own
   *    order/item)
   * 5. Record orderId and itemId from the created order (simulate an item logic,
   *    e.g., items = [order.id] for lack of items SDK)
   * 6. Logout / use a fresh unauthenticated connection, attempt PUT for order item
   *    update as NO user -- must fail
   * 7. Login as customer; attempt PUT for order item update as customer -- must
   *    fail
   *
   * - Both attempts above must throw unauthorized/forbidden errors and NOT
   *   succeed.
   *
   * Implementation notes:
   *
   * - We do not login as admin, nor attempt to succeed the update -- only test
   *   lack-of-privilege cases.
   * - The main negative logic is that no non-admin session, or unauthenticated
   *   session, should be able to update order items via admin API.
   */

  // 1. Register a customer (primary)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerPhone = RandomGenerator.mobile();
  const customerName = RandomGenerator.name();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      phone_number: customerPhone,
      password: customerPassword as string & tags.Format<"password">,
      name: customerName,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // 2. For completeness, register a second customer
  const customer2Email = typia.random<string & tags.Format<"email">>();
  const customer2Password = RandomGenerator.alphaNumeric(12);
  const customer2Phone = RandomGenerator.mobile();
  const customer2Name = RandomGenerator.name();
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customer2Email,
      phone_number: customer2Phone,
      password: customer2Password as string & tags.Format<"password">,
      name: customer2Name,
    } satisfies IShoppingMallAiBackendCustomer.IJoin,
  });

  // 3. Register an admin for logical completeness
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminPassword = RandomGenerator.alphaNumeric(15);
  const adminRealName = RandomGenerator.name();
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      username: adminUsername,
      password_hash: adminPassword,
      name: adminRealName,
      email: adminEmail,
      is_active: true,
    } satisfies IShoppingMallAiBackendAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 4. Customer creates an order (this provides order.id; also will own the order)
  const order =
    await api.functional.shoppingMallAiBackend.customer.orders.create(
      connection,
      {
        body: {
          shopping_mall_ai_backend_customer_id: customerJoin.customer.id,
          shopping_mall_ai_backend_channel_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          code: RandomGenerator.alphaNumeric(12),
          status: "pending",
          total_amount: 15000,
          currency: "KRW",
          ordered_at: new Date().toISOString() as string &
            tags.Format<"date-time">,
        } satisfies IShoppingMallAiBackendOrder.ICreate,
      },
    );
  typia.assert(order);
  const orderId = order.id;
  // Without items endpoint, for test, we'll use a dummy item uuid
  const itemId = typia.random<string & tags.Format<"uuid">>();

  // 5. Attempt #1: Unauthenticated/anonymous user -- no token
  const unauthConn = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot update order item via admin API",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.items.update(
        unauthConn,
        {
          orderId,
          itemId,
          body: {
            quantity: 2,
          } satisfies IShoppingMallAiBackendOrderItem.IUpdate,
        },
      );
    },
  );

  // 6. Attempt #2: Authenticated customer (non-admin)
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: customerPassword as string & tags.Format<"password">,
    } satisfies IShoppingMallAiBackendCustomer.ILogin,
  });

  await TestValidator.error(
    "customer (non-admin) cannot update order item via admin API",
    async () => {
      await api.functional.shoppingMallAiBackend.admin.orders.items.update(
        connection,
        {
          orderId,
          itemId,
          body: {
            quantity: 3,
          } satisfies IShoppingMallAiBackendOrderItem.IUpdate,
        },
      );
    },
  );
}
