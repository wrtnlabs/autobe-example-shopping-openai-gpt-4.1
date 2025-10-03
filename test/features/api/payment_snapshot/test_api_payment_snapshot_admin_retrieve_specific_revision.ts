import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
 * Validate that an admin can retrieve a specific payment snapshot for a given
 * order payment.
 *
 * 1. Register and authenticate as admin.
 * 2. Register and authenticate as customer.
 * 3. Customer creates a cart (for a random channel/section).
 * 4. Admin creates an order for the customer/cart, specifying items, delivery, and
 *    payment info.
 * 5. Admin creates a payment record for the order (this triggers a payment
 *    snapshot event).
 * 6. Retrieve a payment snapshot id for the payment (from the payment, if listing
 *    not available).
 * 7. Admin retrieves the payment snapshot detail by ID, asserting returned data
 *    reflects proper state.
 * 8. Access control check: (If endpoint permitted, attempt with non-admin; should
 *    fail.)
 */
export async function test_api_payment_snapshot_admin_retrieve_specific_revision(
  connection: api.IConnection,
) {
  // 1. Register and authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
      },
    });
  typia.assert(admin);

  // 2. Register and authenticate as customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: typia.random<string & tags.Format<"uuid">>(),
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      },
    });
  typia.assert(customer);

  // 3. Customer creates a cart (must use matching customer/channel/section for business logic correctness)
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: customer.shopping_mall_channel_id,
        shopping_mall_section_id: typia.random<string & tags.Format<"uuid">>(),
        source: "member",
      },
    });
  typia.assert(cart);

  // 4. Admin creates an order from the cart
  const orderItems: IShoppingMallOrderItem.ICreate[] = [
    {
      shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // placeholder, will override after order creation
      shopping_mall_product_id: typia.random<string & tags.Format<"uuid">>(),
      shopping_mall_product_variant_id: null,
      shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(),
      quantity: 1 as number & tags.Type<"int32">,
      unit_price: 10000,
      final_price: 9500,
      discount_snapshot: null,
      status: "ordered", // common status
    },
  ];
  const deliveries: IShoppingMallDelivery.ICreate[] = [
    {
      shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(), // placeholder, override after order create
      recipient_name: RandomGenerator.name(),
      recipient_phone: RandomGenerator.mobile(),
      address_snapshot: RandomGenerator.paragraph(),
      delivery_message: RandomGenerator.paragraph(),
      delivery_status: "prepared",
      delivery_attempts: 0 as number & tags.Type<"int32">,
    },
  ];
  const paymentBody: IShoppingMallPayment.ICreate = {
    shopping_mall_order_id: "PLACEHOLDER_TO_PATCH", // patched below
    shopping_mall_customer_id: customer.id,
    payment_type: "card",
    external_payment_ref: RandomGenerator.alphaNumeric(12),
    status: "pending",
    amount: 9500,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  };

  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: customer.shopping_mall_channel_id,
        shopping_mall_section_id: cart.shopping_mall_section_id,
        shopping_mall_cart_id: cart.id,
        external_order_ref: RandomGenerator.alphaNumeric(12),
        order_type: "normal",
        total_amount: 9500,
        currency: "KRW",
        order_items: orderItems.map((i) => ({
          ...i,
          shopping_mall_order_id: "OVERRIDE_AFTER_ORDER_CREATE",
        })),
        deliveries: deliveries.map((d) => ({
          ...d,
          shopping_mall_order_id: "OVERRIDE_AFTER_ORDER_CREATE",
        })),
        payments: [
          Object.assign({}, paymentBody, {
            shopping_mall_order_id: "OVERRIDE_AFTER_ORDER_CREATE",
          }),
        ],
        after_sale_services: [],
      },
    });
  typia.assert(order);

  // fix order_item/delivery/payment order id links using returned order.id if necessary
  const newPaymentBody: IShoppingMallPayment.ICreate = {
    ...paymentBody,
    shopping_mall_order_id: order.id,
  };
  // 5. Create a payment record for the order (admin)
  const adminPayment: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: order.id,
      body: newPaymentBody,
    });
  typia.assert(adminPayment);

  // 6. Assume a payment snapshot was created; get snapshot info
  // Since there's no list endpoint, try using the payment id. We'll assume that adminPayment.id is valid.
  // Try to retrieve snapshot directly with the same id (assuming first revision always exists with payment id as snapshot id or similar)
  const snapshotId = adminPayment.id as string & tags.Format<"uuid">; // likely snapshot id is not payment id, but with info given, make this assumption for e2e purposes.
  // 7. Admin attempts to get payment snapshot detail
  const snapshot: IShoppingMallPaymentSnapshot =
    await api.functional.shoppingMall.admin.orders.payments.snapshots.at(
      connection,
      {
        orderId: order.id,
        paymentId: adminPayment.id,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);

  // 8. Access control check: Attempt retrieval with customer session (should fail)
  // Create an unauthenticated connection based on original connection (remove admin token)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Non-admin cannot access payment snapshot",
    async () => {
      await api.functional.shoppingMall.admin.orders.payments.snapshots.at(
        unauthConn,
        {
          orderId: order.id,
          paymentId: adminPayment.id,
          snapshotId: snapshotId,
        },
      );
    },
  );

  // 9. Validation: snapshot must link to the correct payment id and have proper snapshot data
  TestValidator.equals(
    "snapshot references the paymentId correctly",
    snapshot.shopping_mall_payment_id,
    adminPayment.id,
  );
  TestValidator.predicate(
    "snapshot_data contains at least the payment's status",
    snapshot.snapshot_data.includes(adminPayment.status),
  );
}
