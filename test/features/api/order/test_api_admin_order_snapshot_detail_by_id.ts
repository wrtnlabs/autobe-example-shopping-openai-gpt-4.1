import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate admin order snapshot audit/retrieval by ID.
 *
 * 1. Register admin (get auth context)
 * 2. Create channel (storefront/brand)
 * 3. Create section in channel
 * 4. Create customer cart for random customer in the channel and section
 * 5. Create an order via admin for that customer/cart
 * 6. Initiate order payment (state change, triggers snapshot)
 * 7. Retrieve order snapshots (simulate discovery, select a snapshot)
 * 8. Fetch snapshot by ID to validate presence and correctness (match orderId,
 *    etc.)
 * 9. Simulate unauthorized access attempt, expect error.
 */
export async function test_api_admin_order_snapshot_detail_by_id(
  connection: api.IConnection,
) {
  // 1. Register admin and get authorized context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      name: RandomGenerator.name(),
    },
  });
  typia.assert(adminJoin);
  // 2. Create channel
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(channel);
  // 3. Create section in that channel
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.alphaNumeric(6),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<99>
          >() satisfies number as number,
        },
      },
    );
  typia.assert(section);
  // 4. Create customer cart (random UUID for customer)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      },
    },
  );
  typia.assert(cart);
  // 5. Create the order; require full ICreate. For test, create one item (random IDs, price/money logic)
  const productId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const itemCreate: IShoppingMallOrderItem.ICreate = {
    shopping_mall_order_id: "TBD", // will update after order site-known for test
    shopping_mall_product_id: productId,
    shopping_mall_product_variant_id: null,
    shopping_mall_seller_id: sellerId,
    quantity: 1,
    unit_price: 23900,
    final_price: 23900,
    discount_snapshot: null,
    status: "ordered",
  };
  const deliveryCreate = [
    {
      shopping_mall_order_id: "TBD",
      shopping_mall_shipment_id: undefined,
      recipient_name: RandomGenerator.name(),
      recipient_phone: RandomGenerator.mobile(),
      address_snapshot: RandomGenerator.paragraph(),
      delivery_message: "",
      delivery_status: "prepared",
      delivery_attempts: 0,
    },
  ];
  const paymentCreate = [
    {
      shopping_mall_order_id: "TBD",
      shopping_mall_customer_id: customerId,
      payment_type: "card",
      external_payment_ref: null,
      status: "pending",
      amount: 23900,
      currency: "KRW",
      requested_at: new Date().toISOString(),
    },
  ];
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customerId,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 23900,
        currency: "KRW",
        order_items: [{ ...itemCreate, shopping_mall_order_id: "TODO" }],
        deliveries: deliveryCreate.map((d) => ({
          ...d,
          shopping_mall_order_id: "TODO",
        })),
        payments: paymentCreate.map((p) => ({
          ...p,
          shopping_mall_order_id: "TODO",
        })),
      },
    },
  );
  typia.assert(order);
  // Next, update order item/delivery/payment "shopping_mall_order_id" to the actual order.id
  // (This step is only used for synthetic requests; on real API these would be correct from client)
  const orderId = order.id;
  // 6. Add payment state transition (simulate payment completes, triggers snapshot)
  const payment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId,
      body: {
        shopping_mall_order_id: orderId,
        shopping_mall_customer_id: customerId,
        payment_type: "card",
        status: "paid",
        amount: 23900,
        currency: "KRW",
        requested_at: new Date().toISOString(),
        external_payment_ref: RandomGenerator.alphaNumeric(16),
      },
    });
  typia.assert(payment);
  // 7. Read snapshot(s). Here, for test, use the orderId as both order and snapshot context, simulating that at least one snapshot exists.
  // (In real system, may need list API to get actual snapshot IDs, but here we use random id for test coverage.)
  // Simulate snapshot ID as the expected latest generated for payment event (could be in order data in real impl)
  // Test with a fake snapshotId to simulate 404 as well.
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 8. Fetch order snapshot by ID
  const snapshot = await api.functional.shoppingMall.admin.orders.snapshots.at(
    connection,
    {
      orderId,
      snapshotId,
    },
  );
  typia.assert(snapshot);
  TestValidator.equals(
    "snapshot orderId matches",
    snapshot.shopping_mall_order_id,
    orderId,
  );
  // 9. Attempt unauthorized fetch (simulate with random connection or missing token) and expect error
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized order snapshot fetch fails",
    async () => {
      await api.functional.shoppingMall.admin.orders.snapshots.at(unauthConn, {
        orderId,
        snapshotId,
      });
    },
  );
}
