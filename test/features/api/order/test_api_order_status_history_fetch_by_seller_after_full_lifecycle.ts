import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderStatusHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallOrderStatusHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatusHistory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a seller can retrieve the full status and transition history of
 * an order they have fulfilled.
 *
 * 1. Register a new seller.
 * 2. Register a new admin (for compliance/admin flows as required for payment
 *    snapshot).
 * 3. Register a new customer and create a shipping address snapshot.
 * 4. Create a new payment method snapshot (admin flow).
 * 5. As the customer, create the order using payment and shipping address
 *    snapshots.
 * 6. As the seller, fetch the order's status history.
 * 7. Verify timeline event data: events exist, actors are attributed correctly,
 *    event_type/status makes sense, timestamps are in sequential order.
 */
export async function test_api_order_status_history_fetch_by_seller_after_full_lifecycle(
  connection: api.IConnection,
) {
  // 1. Register seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "secureSellerPassword1!",
      business_name: RandomGenerator.name(2),
      contact_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(12),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerId = sellerJoin.id;

  // 2. Register admin account (to create payment method snapshot as needed)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "secureAdminPassword1!",
      full_name: RandomGenerator.name(2),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(adminJoin);

  // 3. Register customer & address snapshot
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "secureCustomerPassword1!",
      full_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1, wordMin: 5 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 1, wordMin: 9 }),
        address_line2: null,
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // Create immutable order address snapshot
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(2),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 1, wordMin: 8 }),
          address_detail: null,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 4. Create payment method snapshot as admin
  const orderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(20),
          display_name: `Visa ****${RandomGenerator.alphaNumeric(4)}`,
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(orderPaymentMethod);

  // 5. As customer, create the order
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerId,
        shipping_address_id: orderAddress.id,
        payment_method_id: orderPaymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  const orderId = order.id;

  // 6. As seller, fetch order status history
  // Simulate seller login by setting connection with seller account (join API already set header)
  const statusHistoryResult =
    await api.functional.shoppingMall.seller.orders.statusHistory.index(
      connection,
      {
        orderId,
        body: {
          orderId,
        },
      },
    );
  typia.assert(statusHistoryResult);

  // 7. Verify the returned timeline events
  TestValidator.predicate(
    "status history should not be empty",
    statusHistoryResult.data.length > 0,
  );

  // Events must be sorted by created_at ascending
  for (let i = 1; i < statusHistoryResult.data.length; ++i) {
    const prev = statusHistoryResult.data[i - 1];
    const curr = statusHistoryResult.data[i];
    TestValidator.predicate(
      `created_at must be ascending for event ${i}`,
      prev.created_at <= curr.created_at,
    );
  }

  // At least one event with event_type 'placed' and correct actor
  const placedEvent = statusHistoryResult.data.find(
    (ev) => ev.event_type === "placed",
  );
  TestValidator.predicate(
    "Order placed event exists and actor attribution is set",
    !!placedEvent &&
      placedEvent.status_after === "pending" &&
      placedEvent.actor_customer_id !== undefined &&
      placedEvent.actor_customer_id !== null &&
      placedEvent.actor_seller_id == null &&
      placedEvent.actor_admin_id == null,
  );

  // At least one event with event_type containing status change (e.g. 'status_change' or transition), and status_after is not null
  const hasStatusTransition = statusHistoryResult.data.some(
    (ev) =>
      (ev.event_type?.toLowerCase()?.includes("status") ||
        (ev.status_after !== undefined && ev.status_after !== null)) &&
      typeof ev.status_after === "string" &&
      ev.status_after.length > 0,
  );
  TestValidator.predicate(
    "There are status transition events with non-empty status_after",
    hasStatusTransition,
  );

  // All events must reference the correct order
  for (const ev of statusHistoryResult.data) {
    TestValidator.equals(
      "status history event order id matches order",
      ev.shopping_mall_order_id,
      orderId,
    );

    // All events must have non-empty event_type and valid ISO date created_at
    TestValidator.predicate(
      "event_type should exist",
      typeof ev.event_type === "string" && ev.event_type.length > 0,
    );
    TestValidator.predicate(
      "created_at is ISO date-time",
      typeof ev.created_at === "string" &&
        ev.created_at.length > 0 &&
        !Number.isNaN(Date.parse(ev.created_at)),
    );
  }
}
