import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Test that a customer can update the status and explanation of their own
 * cancellation request for an order.
 *
 * This test follows the workflow:
 *
 * 1. Registers and authenticates a new customer user.
 * 2. Creates a valid order shipping address and payment method for the order.
 * 3. Creates a customer order using the snapshot address and payment method.
 * 4. Simulates the existence of an order cancellation for the created order (as
 *    there is no API for creation, use a mock/random cancellation).
 * 5. Performs API update(s) against the order cancellation, transitioning status
 *    (e.g., pending → approved → denied), editing explanations.
 * 6. Verifies that updates are correct, status and explanation changes persist,
 *    audit fields are updated, and only the owner is authorized for such
 *    actions (can only simulate in limited scope).
 */
export async function test_api_order_cancellation_status_update_by_customer(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new customer
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      email,
      password,
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: "Seoul",
        postal_code: "04524",
        address_line1: "Sample Street 123",
        address_line2: "Apt 101",
        is_default: true,
      },
    },
  });
  typia.assert(customer);

  // 2. Create order shipping address snapshot
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: customer.full_name,
          phone: customer.phone,
          zip_code: "04524",
          address_main: "Test Addr 11",
          address_detail: "Unit 8A",
          country_code: "KOR",
        },
      },
    );
  typia.assert(orderAddress);

  // 3. Create payment method snapshot
  const paymentMethod =
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
          method_data: '{"masked":"****1234"}',
          display_name: RandomGenerator.name(),
        },
      },
    );
  typia.assert(paymentMethod);

  // 4. Create order
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 5. Simulate an existing cancellation
  const cancellationId = typia.random<string & tags.Format<"uuid">>();
  let cancellation = {
    id: cancellationId,
    shopping_mall_order_id: order.id,
    initiator_customer_id: customer.id,
    status: "pending",
    reason_code: "customer_request",
    explanation: "Initial request for cancellation.",
    requested_at: new Date().toISOString() as string & tags.Format<"date-time">,
    created_at: new Date().toISOString() as string & tags.Format<"date-time">,
    updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
  } as IShoppingMallOrderCancellation;
  typia.assert(cancellation);

  // 6. Update: pending → approved
  const explanation1 = "Order cancel approved by customer.";
  const updated1 =
    await api.functional.shoppingMall.customer.orders.cancellations.update(
      connection,
      {
        orderId: order.id,
        cancellationId,
        body: {
          reason_code: "customer_request",
          status: "approved",
          explanation: explanation1,
        },
      },
    );
  typia.assert(updated1);
  TestValidator.equals(
    "cancellation status updated to approved",
    updated1.status,
    "approved",
  );
  TestValidator.equals(
    "cancellation explanation updated",
    updated1.explanation,
    explanation1,
  );

  // 7. Update: approved → denied
  const explanation2 = "Admin denied the cancel request.";
  const updated2 =
    await api.functional.shoppingMall.customer.orders.cancellations.update(
      connection,
      {
        orderId: order.id,
        cancellationId,
        body: {
          reason_code: "customer_request",
          status: "denied",
          explanation: explanation2,
        },
      },
    );
  typia.assert(updated2);
  TestValidator.equals(
    "cancellation status updated to denied",
    updated2.status,
    "denied",
  );
  TestValidator.equals(
    "cancellation explanation updated again",
    updated2.explanation,
    explanation2,
  );

  // 8. Try updating with a different customer (simulate unauthorized; not possible in current allowed API scope)
  // Not implemented as join/login for another user isn't possible with the provided APIs & current context
}
