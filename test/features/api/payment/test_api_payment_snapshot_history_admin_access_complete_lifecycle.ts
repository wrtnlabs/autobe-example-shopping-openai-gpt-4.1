import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallPaymentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentSnapshot";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validate the complete admin lifecycle for searching payment snapshot history
 * (PATCH /shoppingMall/admin/orders/{orderId}/payments/{paymentId}/snapshots).
 *
 * 1. Register and authenticate an admin.
 * 2. Create a customer (with unique channel/section linkage).
 * 3. Create a shopping cart for the customer referencing the
 *    customer/channel/section.
 * 4. Register an order as admin based on the customer cart, with consistent
 *    references and at least one order item and delivery.
 * 5. Create a payment under this order for the customer and order linkage.
 * 6. Simulate an event/change that would trigger the creation of a payment
 *    snapshot (such as status update or automatic triggering if available).
 * 7. As admin, PATCH the snapshot index endpoint for the payment and validate: a.
 *    Correct pagination (limit/page), sort options, date filter, payment ID,
 *    etc. b. Returned data array(s) include all new payment snapshots with
 *    correct fields and references. c. Snapshots reflect payment's actual
 *    business state changes. d. Pagination metadata is correct and matches
 *    records.
 * 8. Attempt to query the endpoint as a non-admin (customer) and confirm that
 *    access is denied (error check).
 *
 * Strictly validate type correctness, linkage integrity across DTOs
 * (customer/channel/section), and proper business logic behaviors.
 */
export async function test_api_payment_snapshot_history_admin_access_complete_lifecycle(
  connection: api.IConnection,
) {
  // 1. Admin registration/authentication
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "adminPW2024!",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoin,
  });
  typia.assert(admin);

  // 2. Register a new customer and authenticate
  const customerJoin = {
    shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "custPW2024!",
    name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: customerJoin,
  });
  typia.assert(customer);

  // 3. Create a shopping cart for the customer (using customer linkage info)
  const cartBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: customer.shopping_mall_channel_id,
    shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
    source: "member",
  } satisfies IShoppingMallCart.ICreate;
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    { body: cartBody },
  );
  typia.assert(cart);

  // 4. Register a new order as admin, using cart, and make test order item/delivery
  // Use one item/order/delivery, supply consistent references
  const productId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const orderItem: IShoppingMallOrderItem.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_id: productId,
    shopping_mall_product_variant_id: null,
    shopping_mall_seller_id: sellerId,
    quantity: 1 as number & tags.Type<"int32">,
    unit_price: 10000,
    final_price: 10000,
    discount_snapshot: null,
    status: "ordered",
  };

  const orderDelivery: IShoppingMallDelivery.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_shipment_id: undefined,
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: "123 Seoul Way, South Korea",
    delivery_message: undefined,
    delivery_status: "prepared",
    delivery_attempts: 1 as number & tags.Type<"int32">,
  };

  const orderCreateBody = {
    shopping_mall_customer_id: customer.id,
    shopping_mall_channel_id: cart.shopping_mall_channel_id,
    shopping_mall_section_id: cart.shopping_mall_section_id,
    shopping_mall_cart_id: cart.id,
    external_order_ref: null,
    order_type: "normal",
    total_amount: 10000,
    currency: "KRW",
    order_items: [orderItem],
    deliveries: [orderDelivery],
    payments: [], // Adding payment in next step
    after_sale_services: [],
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    { body: orderCreateBody },
  );
  typia.assert(order);

  // 5. Create a payment under this order (with references)
  const paymentBody = {
    shopping_mall_order_id: order.id,
    shopping_mall_customer_id: customer.id,
    payment_type: "card",
    external_payment_ref: "PAYTEST202410091234",
    status: "paid",
    amount: order.total_amount,
    currency: order.currency,
    requested_at: new Date().toISOString() satisfies string &
      tags.Format<"date-time">,
  } satisfies IShoppingMallPayment.ICreate;
  const payment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: order.id,
      body: paymentBody,
    });
  typia.assert(payment);

  // 6. Simulate a status update (e.g., manually or mock status) to trigger a payment snapshot
  // (If there is no update API, rely on initial state triggering snapshot; if available, call status update endpoint here with new status)

  // 7. PATCH (search) as admin for payment snapshots with filters/pagination
  const snapshotRequestBody = {
    shopping_mall_payment_id: payment.id,
    created_from: null,
    created_to: null,
    limit: 10 as number & tags.Type<"int32">,
    page: 1 as number & tags.Type<"int32">,
    sort_by: "created_at",
    sort_order: "desc",
  } satisfies IShoppingMallPaymentSnapshot.IRequest;

  const snapshotsPage =
    await api.functional.shoppingMall.admin.orders.payments.snapshots.index(
      connection,
      {
        orderId: order.id,
        paymentId: payment.id,
        body: snapshotRequestBody,
      },
    );
  typia.assert(snapshotsPage);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination metadata is valid",
    snapshotsPage.pagination.records >= 1 &&
      snapshotsPage.pagination.current === 1,
  );
  // Ensure at least one snapshot returned, fields match payment
  TestValidator.predicate(
    "at least one payment snapshot exists",
    snapshotsPage.data.length >= 1,
  );
  for (const snap of snapshotsPage.data) {
    typia.assert(snap);
    TestValidator.equals(
      "snapshot payment id matches",
      snap.shopping_mall_payment_id,
      payment.id,
    );
  }

  // 8. Attempt to access as non-admin (customer): should fail with access denied error
  // Switch to customer by executing the join API (which sets connection headers)
  await api.functional.auth.customer.join(connection, { body: customerJoin });

  await TestValidator.error(
    "customer cannot access admin payment snapshot search",
    async () => {
      await api.functional.shoppingMall.admin.orders.payments.snapshots.index(
        connection,
        {
          orderId: order.id,
          paymentId: payment.id,
          body: snapshotRequestBody,
        },
      );
    },
  );
}
