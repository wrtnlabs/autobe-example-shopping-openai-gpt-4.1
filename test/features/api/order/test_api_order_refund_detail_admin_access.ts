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
 * Validate that admin can retrieve specific refund details for an order. Steps:
 *
 * 1. Register new admin (will later check refund as admin)
 * 2. Register new customer (who places order & requests refund)
 * 3. As customer, create order address snapshot
 * 4. As admin, create payment method snapshot
 * 5. As customer, create order using above snapshots
 * 6. As customer, request refund on the order
 * 7. As admin, request refund details for that order/refund ID
 * 8. Assert that all refund details are present and correct for admin-level
 *    visibility
 */
export async function test_api_order_refund_detail_admin_access(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerAddress = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphaNumeric(6),
    address_line1: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }),
    address_line2: null,
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: customerAddress,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. As customer, create order address snapshot
  const orderAddressBody = {
    address_type: "shipping",
    recipient_name: customer.full_name,
    phone: customer.phone,
    zip_code: RandomGenerator.alphaNumeric(5),
    address_main: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 10,
      wordMax: 15,
    }),
    address_detail: null,
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: orderAddressBody,
      },
    );
  typia.assert(orderAddress);

  // 4. As admin, create payment method snapshot (admin switches context, creates reusable method)
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: admin.token.access,
      full_name: admin.full_name,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  const paymentBody = {
    payment_method_type: RandomGenerator.pick([
      "card",
      "bank_transfer",
      "paypal",
      "virtual_account",
    ] as const),
    method_data: RandomGenerator.alphaNumeric(10),
    display_name: `Pay ${RandomGenerator.name(1)}`,
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: paymentBody,
      },
    );
  typia.assert(paymentMethod);

  // 5. As customer, create order using snapshots
  await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customer.token.access,
      full_name: customer.full_name,
      phone: customer.phone,
      address: customerAddress,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const orderBody = {
    shipping_address_id: orderAddress.id,
    payment_method_id: paymentMethod.id,
    order_total: 88000,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderBody,
    });
  typia.assert(order);

  // 6. As customer, request refund on the order
  const refundReason = RandomGenerator.pick([
    "customer_cancel",
    "failed_delivery",
    "defective",
    "overcharge",
    "goodwill",
  ] as const);
  const refundBody = {
    orderId: order.id,
    reason_code: refundReason,
    refund_amount: order.order_total,
    currency: order.currency,
    explanation: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallOrderRefund.ICreate;
  const refund: IShoppingMallOrderRefund =
    await api.functional.shoppingMall.customer.orders.refunds.create(
      connection,
      {
        orderId: order.id,
        body: refundBody,
      },
    );
  typia.assert(refund);

  // 7. As admin, switch to admin and retrieve refund details
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: admin.token.access,
      full_name: admin.full_name,
    } satisfies IShoppingMallAdmin.ICreate,
  });
  const refundDetails: IShoppingMallOrderRefund =
    await api.functional.shoppingMall.admin.orders.refunds.at(connection, {
      orderId: order.id,
      refundId: refund.id,
    });
  typia.assert(refundDetails);
  // 8. Assert that all major refund details are present and as expected
  TestValidator.equals(
    "refund order id matches",
    refundDetails.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals("refund id matches", refundDetails.id, refund.id);
  TestValidator.equals(
    "refund reason code matches",
    refundDetails.reason_code,
    refundReason,
  );
  TestValidator.equals(
    "refund amount matches order",
    refundDetails.refund_amount,
    order.order_total,
  );
  TestValidator.equals(
    "refund currency matches order",
    refundDetails.currency,
    order.currency,
  );
  TestValidator.predicate(
    "refund status is pending|approved|completed|denied",
    ["pending", "approved", "completed", "denied"].includes(
      refundDetails.status,
    ),
  );
  TestValidator.equals(
    "refund explanation matches",
    refundDetails.explanation,
    refundBody.explanation,
  );
  // Audit timestamps
  TestValidator.predicate(
    "refund created_at is ISO",
    typeof refundDetails.created_at === "string" &&
      refundDetails.created_at.includes("T"),
  );
  TestValidator.predicate(
    "refund updated_at is ISO",
    typeof refundDetails.updated_at === "string" &&
      refundDetails.updated_at.includes("T"),
  );
}
