import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";

/**
 * End-to-end test for the admin approval flow of a customer order refund
 * request.
 *
 * 1. Register a new admin for refund approval operations.
 * 2. Register a new customer who will place the order and initiate the refund
 *    request.
 * 3. Create an order address snapshot for use as the shipping address.
 * 4. Admin creates a new payment method snapshot for the order.
 * 5. Customer places an order using the created shipping address and payment
 *    method.
 * 6. Customer requests a refund for the order.
 * 7. Admin approves the pending refund, providing resolution and explanation.
 * 8. Audit the refund to ensure it transitioned from 'pending' to 'approved',
 *    fields recorded correctly, and admin id matches.
 * 9. Attempt to approve the same refund again (invalid transition), verify
 *    business rule prevents update (error expected).
 */
export async function test_api_admin_refund_request_update_approval_flow(
  connection: api.IConnection,
) {
  // 1. Register Admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(16),
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register Customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerAddress = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.paragraph({ sentences: 2 }),
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({ sentences: 3 }),
    address_line2: null,
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(10) + "!A@#",
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: customerAddress,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. Create Shipping Address Snapshot (order address)
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: customerAddress.recipient_name,
          phone: customerAddress.phone,
          zip_code: customerAddress.postal_code,
          address_main: customerAddress.address_line1,
          address_detail: null,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 4. Admin creates Payment Method Snapshot
  const orderPaymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: RandomGenerator.pick([
            "card",
            "bank_transfer",
            "paypal",
            "virtual_account",
          ] as const),
          method_data: RandomGenerator.alphaNumeric(12),
          display_name: RandomGenerator.name(),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(orderPaymentMethod);

  // 5. Customer places an Order
  const orderTotal = Math.floor(10000 + Math.random() * 100000);
  const orderCurrency = "KRW";
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_seller_id: undefined,
        shipping_address_id: orderAddress.id,
        payment_method_id: orderPaymentMethod.id,
        order_total: orderTotal,
        currency: orderCurrency,
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 6. Customer requests a Refund
  const refundReason = RandomGenerator.pick([
    "customer_cancel",
    "failed_delivery",
    "defective",
    "overcharge",
    "goodwill",
  ] as const);
  const refundExplanation = RandomGenerator.paragraph({ sentences: 4 });
  const refundAmount = order.order_total;
  const refund: IShoppingMallOrderRefund =
    await api.functional.shoppingMall.customer.orders.refunds.create(
      connection,
      {
        orderId: order.id,
        body: {
          orderId: order.id,
          reason_code: refundReason,
          refund_amount: refundAmount,
          currency: order.currency,
          explanation: refundExplanation,
        } satisfies IShoppingMallOrderRefund.ICreate,
      },
    );
  typia.assert(refund);
  TestValidator.equals("refund starts pending", refund.status, "pending");

  // 7. Admin approves the Refund (pending -> approved)
  const approvalExplanation = RandomGenerator.paragraph({ sentences: 3 });
  const resolutionType = RandomGenerator.pick([
    "refund-granted",
    "upheld-denial",
    "manual override",
  ] as const);
  const approvedRefund: IShoppingMallOrderRefund =
    await api.functional.shoppingMall.admin.orders.refunds.update(connection, {
      orderId: order.id,
      refundId: refund.id,
      body: {
        status: "approved",
        resolution_type: resolutionType,
        explanation: approvalExplanation,
      } satisfies IShoppingMallOrderRefund.IUpdate,
    });
  typia.assert(approvedRefund);
  TestValidator.equals(
    "refund now approved",
    approvedRefund.status,
    "approved",
  );
  TestValidator.equals(
    "admin audit set",
    approvedRefund.initiator_admin_id,
    admin.id,
  );
  TestValidator.equals(
    "explanation present",
    approvedRefund.explanation,
    approvalExplanation,
  );

  // 8. Verify invalid transition (cannot approve twice)
  await TestValidator.error("invalid status transition fails", async () => {
    await api.functional.shoppingMall.admin.orders.refunds.update(connection, {
      orderId: order.id,
      refundId: refund.id,
      body: {
        status: "approved",
        resolution_type: resolutionType,
        explanation: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IShoppingMallOrderRefund.IUpdate,
    });
  });
}
