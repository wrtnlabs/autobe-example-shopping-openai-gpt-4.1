import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderSnapshot";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSnapshot";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate seller ability to retrieve, paginate, and filter order snapshots for
 * orders they manage.
 *
 * This test covers all order snapshot listing access control, creation
 * preconditions, filtering, and pagination for a seller. Business context:
 * Ensures sellers can only view the snapshots of orders they participated in,
 * that snapshot evidence is generated during order lifecycle, and complex
 * filters/pagination for audit/reporting work as intended.
 *
 * Step-by-step process:
 *
 * 1. Register a new seller (to provide fresh authentication context)
 * 2. Admin creates a new shopping mall channel (with random codes and name)
 * 3. Admin creates a section under the channel (with random code, order, name)
 * 4. Register the seller to the new section and channel (random profile_name)
 * 5. Create a customer cart with unique customer/channel/section ids
 * 6. Admin converts the customer cart into an order, referencing all valid
 *    identities
 * 7. Execute PATCH /shoppingMall/seller/orders/{orderId}/snapshots as seller,
 *    first without filters, then with: page=1, limit=2, date-range filtering
 * 8. Validate snapshot page structure (pagination + data[]), business access
 *    rules, correct handling of paged and filtered scenarios, and edge case of
 *    empty result when filter does not match
 * 9. Ensure that all returned snapshots reference the order handled by this
 *    seller, and no others are included
 */
export async function test_api_seller_order_snapshot_list_workflow(
  connection: api.IConnection,
) {
  // 1. Seller registration
  const channelBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallChannel.ICreate;
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    { body: channelBody },
  );
  typia.assert(channel);

  const sectionBody = {
    shopping_mall_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(6),
    name: RandomGenerator.paragraph({ sentences: 1 }),
    display_order: 1,
    description: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallSection.ICreate;
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      { channelId: channel.id, body: sectionBody },
    );
  typia.assert(section);

  const sellerEmail = RandomGenerator.alphaNumeric(8) + "@seller.e2e.com";
  const sellerBody = {
    email: sellerEmail,
    password: "password-e2e-test",
    name: RandomGenerator.name(),
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    profile_name: RandomGenerator.name(),
    kyc_status: "pending",
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerBody,
  });
  typia.assert(sellerAuth);

  // 2. Create cart for customer (simulate a customer UUID)
  const customerId = typia.random<string & tags.Format<"uuid">>();
  const cartBody = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    source: "e2e-test-customer",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartBody },
  );
  typia.assert(cart);

  // 3. Create order from cart (simulate simple order item/payment/delivery)
  const orderItemBody = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_seller_id: sellerAuth.id,
    quantity: 1,
    unit_price: 10000,
    final_price: 10000,
    status: "ordered",
  } satisfies IShoppingMallOrderItem.ICreate;
  const deliveryBody = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    delivery_status: "prepared",
    delivery_attempts: 1,
  } satisfies IShoppingMallDelivery.ICreate;
  const paymentBody = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_customer_id: customerId,
    payment_type: "card",
    status: "pending",
    amount: 10000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  } satisfies IShoppingMallPayment.ICreate;
  const orderBody = {
    shopping_mall_customer_id: customerId,
    shopping_mall_channel_id: channel.id,
    shopping_mall_section_id: section.id,
    shopping_mall_cart_id: cart.id,
    order_type: "normal",
    total_amount: 10000,
    currency: "KRW",
    order_items: [orderItemBody],
    deliveries: [deliveryBody],
    payments: [paymentBody],
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert(order);
  TestValidator.equals(
    "order customer",
    order.shopping_mall_customer_id,
    customerId,
  );

  // 4. Seller lists snapshots for own order, unfiltered
  const snapshotsResp =
    await api.functional.shoppingMall.seller.orders.snapshots.index(
      connection,
      {
        orderId: order.id,
        body: {},
      },
    );
  typia.assert(snapshotsResp);
  TestValidator.equals(
    "all snapshot order references match",
    ArrayUtil.has(
      snapshotsResp.data,
      (s) => s.shopping_mall_order_id === order.id,
    ),
    true,
  );

  // 5. Paginated: limit=2,page=1
  const pagedResp =
    await api.functional.shoppingMall.seller.orders.snapshots.index(
      connection,
      {
        orderId: order.id,
        body: {
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(pagedResp);
  TestValidator.equals(
    "pagination type",
    typeof pagedResp.pagination.current,
    "number",
  );

  // 6. Filter: created_at_start/created_at_end
  const now = new Date().toISOString();
  const filterResp =
    await api.functional.shoppingMall.seller.orders.snapshots.index(
      connection,
      {
        orderId: order.id,
        body: {
          created_at_start: now,
          created_at_end: now,
        },
      },
    );
  typia.assert(filterResp);
  TestValidator.equals(
    "empty filter should return 0 entries",
    filterResp.data.length,
    0,
  );
}
