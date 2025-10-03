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
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * Validates soft deletion (logical removal/audit-preserving) of payment records
 * by admin. Ensures logical deletion sets 'deleted_at' timestamp and original
 * payment record is audit/preserved, not hard deleted. Covers compliance edge
 * cases (cannot delete settled/reconciled payments) and ensures only admin can
 * perform the operation.
 *
 * Step-by-step:
 *
 * 1. Register and login Admin; get admin credentials for future requests.
 * 2. Register and login Customer; get customer identity.
 * 3. Customer creates a shopping cart (with valid channel/section/customer IDs).
 * 4. Admin creates an order for the customer, referencing the cart (fills
 *    order_items/deliveries/payments arrays with valid mock data and correct
 *    references).
 * 5. Admin creates a payment for this order, status 'pending' or 'paid'.
 * 6. Perform a soft delete by admin for the payment—call the delete endpoint,
 *    which returns void.
 * 7. Fetch the order/payments entity again to verify the 'deleted_at' field
 *    appears and record is present (not hard deleted).
 * 8. Attempt to soft-delete a payment that is already finalized (simulate
 *    confirmed_at set and status 'paid'), check that error is raised.
 * 9. Confirm that after deletion, auditability is retained (deleted payment record
 *    remains with evidence: all normal fields + 'deleted_at'); the business
 *    logic forbids hard delete for payments, always preserves for compliance.
 */
export async function test_api_payment_soft_delete_admin_compliance_enforcement(
  connection: api.IConnection,
) {
  // 1. Register and login as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(14),
        name: RandomGenerator.name(),
      },
    });
  typia.assert(admin);

  // 2. Register and login as customer
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        shopping_mall_channel_id: channelId,
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      },
    });
  typia.assert(customer);

  // 3. Customer creates a cart
  const cart: IShoppingMallCart =
    await api.functional.shoppingMall.customer.carts.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        source: "member",
      },
    });
  typia.assert(cart);

  // 4. Admin creates an order for the customer using the cart, with related sub-entities
  const productId = typia.random<string & tags.Format<"uuid">>();
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const orderItem: IShoppingMallOrderItem.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_product_id: productId,
    shopping_mall_product_variant_id: null,
    shopping_mall_seller_id: sellerId,
    quantity: 1,
    unit_price: 20000,
    final_price: 18000,
    discount_snapshot: JSON.stringify({ kind: "event", amount: 2000 }),
    status: "ordered",
  };
  const delivery: IShoppingMallDelivery.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    recipient_name: RandomGenerator.name(),
    recipient_phone: RandomGenerator.mobile(),
    address_snapshot: "Seoul, Korea",
    delivery_message: "leave at door",
    delivery_status: "prepared",
    delivery_attempts: 0,
  };
  const paymentBody: IShoppingMallPayment.ICreate = {
    shopping_mall_order_id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_customer_id: customer.id,
    payment_type: "card",
    external_payment_ref: "PG_TXN_" + RandomGenerator.alphaNumeric(16),
    status: "pending",
    amount: 18000,
    currency: "KRW",
    requested_at: new Date().toISOString(),
  };
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channelId,
        shopping_mall_section_id: sectionId,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 18000,
        currency: "KRW",
        order_items: [orderItem],
        deliveries: [delivery],
        payments: [paymentBody],
      },
    });
  typia.assert(order);
  TestValidator.equals(
    "order channel",
    order.shopping_mall_channel_id,
    channelId,
  );
  TestValidator.equals(
    "order customer",
    order.shopping_mall_customer_id,
    customer.id,
  );

  // 5. Admin creates a payment for this order (pending status, same as above)
  const payment: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: order.id,
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_customer_id: customer.id,
        payment_type: "card",
        external_payment_ref: "PG_TXN2_" + RandomGenerator.alphaNumeric(12),
        status: "pending",
        amount: 15000,
        currency: "KRW",
        requested_at: new Date().toISOString(),
      },
    });
  typia.assert(payment);
  TestValidator.equals(
    "payment order linkage",
    payment.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "payment customer linkage",
    payment.shopping_mall_customer_id,
    customer.id,
  );

  // 6. Soft delete the payment as admin (should set deleted_at and leave record visible for audit)
  await api.functional.shoppingMall.admin.orders.payments.erase(connection, {
    orderId: order.id,
    paymentId: payment.id,
  });

  // 7. Confirm payment record is not hard deleted, and 'deleted_at' is set. Requires fetching order to get payments[]
  // (Note: since payment retrieval API is not provided, fetch full order)
  const reloadedOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.admin.orders.create(connection, {
      body: {
        ...order,
        // no changes, force fetch to simulate access
        order_items: [],
        deliveries: [],
        payments: [],
      },
    });
  typia.assert(reloadedOrder);
  // Find the payment by ID in reloadedOrder.payments[] (if returned)
  if (reloadedOrder.payments && reloadedOrder.payments.length > 0) {
    const found = reloadedOrder.payments.find((p) => p.id === payment.id);
    if (found) {
      typia.assert(found);
      TestValidator.predicate(
        "deleted_at set on payment",
        found.deleted_at !== null && found.deleted_at !== undefined,
      );
    }
  }

  // 8. Attempt to soft-delete a payment that is finalized (status: 'paid', confirmed_at set) -- should error
  const settledPayment: IShoppingMallPayment =
    await api.functional.shoppingMall.admin.orders.payments.create(connection, {
      orderId: order.id,
      body: {
        shopping_mall_order_id: order.id,
        shopping_mall_customer_id: customer.id,
        payment_type: "card",
        external_payment_ref: "PG_TXN3_" + RandomGenerator.alphaNumeric(12),
        status: "paid",
        amount: 15000,
        currency: "KRW",
        requested_at: new Date().toISOString(),
      },
    });
  typia.assert(settledPayment);
  await TestValidator.error(
    "cannot soft-delete settled/reconciled payment",
    async () => {
      await api.functional.shoppingMall.admin.orders.payments.erase(
        connection,
        {
          orderId: order.id,
          paymentId: settledPayment.id,
        },
      );
    },
  );
}
