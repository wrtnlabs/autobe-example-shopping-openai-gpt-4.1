import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";

/**
 * Validates that an authenticated customer can request a refund for an eligible
 * order.
 *
 * This workflow covers the required preparatory steps, refund request, and
 * business validation:
 *
 * 1. Register a new customer with random valid credentials and an address
 * 2. Create (or reuse) a valid order address snapshot for the order
 * 3. Create a valid payment method snapshot using admin API
 * 4. Create a new order for the customer using above address and payment method
 *    snapshots
 * 5. Perform a refund request against that order with all required fields and
 *    business data
 * 6. Validate that the refund is created with the correct status, reference
 *    fields, amount, currency, audit trail; confirm relationships between order
 *    and refund
 */
export async function test_api_order_refund_request_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer and get authorization
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const joinAddress = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.paragraph({ sentences: 1 }),
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: RandomGenerator.paragraph({ sentences: 1 }),
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const auth = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: joinAddress,
    },
  });
  typia.assert(auth);

  // 2. Create an order address snapshot (required for order placement)
  const orderAddressBody = {
    address_type: "shipping",
    recipient_name: joinAddress.recipient_name,
    phone: joinAddress.phone,
    zip_code: joinAddress.postal_code,
    address_main: joinAddress.address_line1,
    address_detail: joinAddress.address_line2,
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: orderAddressBody,
      },
    );
  typia.assert(orderAddress);

  // 3. Create a payment method snapshot (admin API)
  const orderPaymentMethodBody = {
    payment_method_type: RandomGenerator.pick([
      "card",
      "bank_transfer",
      "paypal",
      "virtual_account",
    ] as const),
    method_data: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(2),
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const orderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: orderPaymentMethodBody,
      },
    );
  typia.assert(orderPaymentMethod);

  // 4. Create a new order for the customer (simulate eligible order)
  const orderBody = {
    shipping_address_id: orderAddress.id,
    payment_method_id: orderPaymentMethod.id,
    order_total: 50000,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);

  // 5. Perform refund request against this order
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
  const refund =
    await api.functional.shoppingMall.customer.orders.refunds.create(
      connection,
      {
        orderId: order.id,
        body: refundBody,
      },
    );
  typia.assert(refund);
  TestValidator.equals(
    "refund is for correct order",
    refund.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "refund amount equals order total",
    refund.refund_amount,
    order.order_total,
  );
  TestValidator.equals(
    "currency matches order",
    refund.currency,
    order.currency,
  );
  TestValidator.equals(
    "status is pending (awaiting review)",
    refund.status,
    "pending",
  );
  TestValidator.equals("reason code is set", refund.reason_code, refundReason);
  TestValidator.predicate(
    "refund id is uuid",
    typeof refund.id === "string" && /[0-9a-f-]{36}/i.test(refund.id),
  );
  TestValidator.predicate(
    "requested_at is ISO date-time",
    typeof refund.requested_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(refund.requested_at),
  );
  TestValidator.predicate(
    "created_at is ISO date-time",
    typeof refund.created_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(refund.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    typeof refund.updated_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(refund.updated_at),
  );
}
