import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendPayment";

/**
 * Test that a seller cannot create a payment for an order they do not own or
 * for an order that does not exist.
 *
 * Business context:
 *
 * - Sellers can only create payments for their own orders.
 * - Attempting to create a payment for another seller's order or a non-existent
 *   order must result in an error (either permission denied or not found).
 * - This protects financial integrity and enforces access control boundaries.
 *
 * Steps:
 *
 * 1. Create two seller accounts (sellerA and sellerB) with unique contact details.
 * 2. Create a customer account with required information.
 * 3. As the customer, place an order for sellerB (not sellerA).
 * 4. Attempt to create a payment for the order as sellerA (wrong seller, should
 *    fail).
 * 5. Attempt to create a payment using a random (non-existent) order ID as sellerA
 *    (order does not exist, should fail).
 * 6. (Validate runtime errors are thrown in both cases)
 */
export async function test_api_aimall_backend_test_seller_create_payment_with_invalid_order_returns_error(
  connection: api.IConnection,
) {
  // 1. Create sellerA
  const sellerA =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: "Seller A Corp.",
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerA);

  // 2. Create sellerB
  const sellerB =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: "Seller B Corp.",
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(sellerB);

  // 3. Create a customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null, // Assume created without password for admin flow
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 4. As the customer, place an order with sellerB
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: sellerB.id,
        address_id: typia.random<string & tags.Format<"uuid">>(),
        // Omit order_number to let system auto-generate
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 5. Attempt to create a payment as sellerA for sellerB's order (should fail)
  TestValidator.error(
    "sellerA should not be able to pay for order belonging to sellerB",
  )(async () => {
    await api.functional.aimall_backend.seller.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          payment_method: "credit_card",
          amount: 10000,
          currency: "KRW",
          transaction_id: null,
        } satisfies IAimallBackendPayment.ICreate,
      },
    );
  });

  // 6. Attempt to create a payment on a non-existent order as sellerA (should fail)
  TestValidator.error("should fail for non-existent order ID")(async () => {
    await api.functional.aimall_backend.seller.orders.payments.create(
      connection,
      {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          payment_method: "credit_card",
          amount: 10000,
          currency: "KRW",
          transaction_id: null,
        } satisfies IAimallBackendPayment.ICreate,
      },
    );
  });
}
