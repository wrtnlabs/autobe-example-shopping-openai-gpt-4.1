import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusHistory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";

/**
 * Validates customer retrieval of own order's status history with paging and
 * verifies access denial for other orders.
 *
 * 1. Register customer (join)
 * 2. Create order address snapshot
 * 3. Create payment method snapshot (admin)
 * 4. Place a customer order linking to the address and payment snapshots
 * 5. Retrieve the status history for the order as the owning customer, check event
 *    actor, event_type, and paging fields
 * 6. Attempt to retrieve status history for a non-owned/random order, expect
 *    error/denial
 * 7. Check pagination for the history endpoint (e.g., limit=1)
 *
 * No explicit status transitions or multi-actor history due to API limitations:
 * validation focuses on access, correct linkage, and pagination meta.
 */
export async function test_api_order_status_history_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Register customer (join)
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 2 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      address_line2: null,
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate,
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinInput,
  });
  typia.assert(customer);

  // 2. Create order address snapshot
  const addressInput = {
    address_type: "shipping",
    recipient_name: customer.full_name,
    phone: customer.phone,
    zip_code: "12345",
    address_main: RandomGenerator.paragraph({ sentences: 3 }),
    address_detail: null,
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: addressInput },
    );
  typia.assert(orderAddress);

  // 3. Create payment method snapshot (admin)
  const paymentInput = {
    payment_method_type: "card",
    method_data: RandomGenerator.alphaNumeric(12),
    display_name: "Visa ****1234",
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: paymentInput },
    );
  typia.assert(paymentMethod);

  // 4. Place an order
  const orderInput = {
    shipping_address_id: orderAddress.id,
    payment_method_id: paymentMethod.id,
    order_total: 29990,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderInput },
  );
  typia.assert(order);

  // 5. Retrieve own order's status history
  const historyResp =
    await api.functional.shoppingMall.customer.orders.statusHistory.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 2,
        } satisfies IShoppingMallOrderStatusHistory.IRequest,
      },
    );
  typia.assert(historyResp);
  TestValidator.equals(
    "valid status history for own order should return events",
    historyResp.data.length > 0,
    true,
  );
  // Check for event_type and actor_customer_id match if possible
  const foundEvent = historyResp.data[0];
  TestValidator.equals(
    "first status history entry belongs to order",
    foundEvent.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "first entry actor matches customer",
    foundEvent.actor_customer_id,
    customer.id,
  );

  // 6. Attempt status history retrieval for non-owned/random order, expect error
  await TestValidator.error(
    "should deny access to non-owned order status history",
    async () => {
      await api.functional.shoppingMall.customer.orders.statusHistory.index(
        connection,
        {
          orderId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 1,
          } satisfies IShoppingMallOrderStatusHistory.IRequest,
        },
      );
    },
  );

  // 7. Confirm pagination meta fields
  TestValidator.equals(
    "pagination object exists",
    typeof historyResp.pagination,
    "object",
  );
}
