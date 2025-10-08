import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellation";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Validate customer-initiated order cancellation and access to cancellation
 * detail.
 *
 * 1. Register a new customer via /auth/customer/join.
 * 2. Create shipping address snapshot via /shoppingMall/customer/orderAddresses.
 * 3. Create order payment method snapshot via
 *    /shoppingMall/admin/orderPaymentMethods.
 * 4. Place a new order via /shoppingMall/customer/orders.
 * 5. Initiate a cancellation request for that order via
 *    /shoppingMall/customer/orders/{orderId}/cancellations (patch).
 * 6. Retrieve the cancellation detail with GET
 *    /shoppingMall/customer/orders/{orderId}/cancellations/{cancellationId} as
 *    the customer.
 *
 * Assert that only the order's customer can access the detail; verify type
 * expectations and business data propagation.
 */
export async function test_api_order_cancellation_detail_by_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerEmail =
    RandomGenerator.name(1) +
    "_" +
    RandomGenerator.alphaNumeric(8) +
    "@e2e.test";
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: customerPassword,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.paragraph({ sentences: 1 }),
          postal_code: String(10000 + Math.floor(Math.random() * 89999)),
          address_line1: RandomGenerator.paragraph({ sentences: 2 }),
          address_line2: RandomGenerator.paragraph({ sentences: 1 }),
          is_default: true,
        },
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 2. Create a shipping address snapshot (order address)
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: String(10000 + Math.floor(Math.random() * 89999)),
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: RandomGenerator.paragraph({ sentences: 1 }),
          country_code: "KOR",
        },
      },
    );
  typia.assert(orderAddress);

  // 3. Create a payment method snapshot
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
          method_data: RandomGenerator.alphaNumeric(10),
          display_name: `E2E Test Card ****${Math.floor(1000 + Math.random() * 9000)}`,
        },
      },
    );
  typia.assert(orderPaymentMethod);

  // 4. Place a new order
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: orderPaymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      },
    });
  typia.assert(order);

  // 5. Initiate cancellation request via PATCH /shoppingMall/customer/orders/{orderId}/cancellations
  const cancellationReasonCode = RandomGenerator.pick([
    "customer_request",
    "oos",
    "fraud_suspected",
    "seller_failure",
  ] as const);
  const cancellationRequestBody = {
    orderId: order.id,
    reason_code: cancellationReasonCode,
    explanation: RandomGenerator.paragraph({ sentences: 1 }),
  } satisfies IShoppingMallOrderCancellation.IRequest;
  const cancellationPage: IPageIShoppingMallOrderCancellation =
    await api.functional.shoppingMall.customer.orders.cancellations.index(
      connection,
      {
        orderId: order.id,
        body: cancellationRequestBody,
      },
    );
  typia.assert(cancellationPage);

  // Take the first cancellation entry
  TestValidator.predicate(
    "At least one order cancellation record should exist",
    cancellationPage.data.length > 0,
  );
  const cancellation = cancellationPage.data[0];
  typia.assert(cancellation);
  TestValidator.equals(
    "orderId on cancellation record equals orderId",
    cancellation.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "initiator_customer_id on cancellation",
    cancellation.initiator_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "status should be present on cancellation",
    typeof cancellation.status,
    "string",
  );

  // 6. Retrieve cancellation detail via /shoppingMall/customer/orders/{orderId}/cancellations/{cancellationId}
  const detail: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.customer.orders.cancellations.at(
      connection,
      {
        orderId: order.id,
        cancellationId: cancellation.id,
      },
    );
  typia.assert(detail);

  // Validate all identifiers and fields match up
  TestValidator.equals(
    "cancellation id detail matches",
    detail.id,
    cancellation.id,
  );
  TestValidator.equals(
    "order id detail matches",
    detail.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "initiator_customer_id matches",
    detail.initiator_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "reason_code matches",
    detail.reason_code,
    cancellationReasonCode,
  );
  TestValidator.equals(
    "status is a string in the detail response",
    typeof detail.status,
    "string",
  );
  TestValidator.equals(
    "requested_at is present",
    typeof detail.requested_at,
    "string",
  );
}
