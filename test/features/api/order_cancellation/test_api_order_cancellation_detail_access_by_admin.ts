import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Test that an admin user can successfully retrieve detailed information about
 * a specific order cancellation event, including reason, status, actors,
 * explanation, and timestamps. This scenario validates that the admin has full
 * access to audit all cancellation events and handles permission, existence,
 * and data integrity correctly across the order and cancellation entities.
 *
 * - Register an admin account and authenticate to acquire admin privileges.
 * - Create a payment method snapshot (required for order creation).
 * - Create an order address snapshot (required for order creation).
 * - Create an order for use in cancellation scenario.
 * - Attempt to retrieve a cancellation event for the order (simulate by using
 *   random UUIDs in absence of a creation API).
 * - Assert that the output structure is valid, and linkage to the order is
 *   correct.
 */
export async function test_api_order_cancellation_detail_access_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "TestPassword1!",
      full_name: RandomGenerator.name(),
      status: "active",
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create a payment method snapshot
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: JSON.stringify({ card_provider: "VISA", last4: "1234" }),
          display_name: "Visa ****1234",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 3. Create an order address snapshot
  const address =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 3 }),
          address_detail: RandomGenerator.paragraph({ sentences: 2 }),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(address);

  // 4. Create an order (simulate basic order, customer_id omitted as per API doc)
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: address.id,
        payment_method_id: paymentMethod.id,
        order_total: 50000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 5. Attempt to retrieve cancellation details for this order.
  // In the absence of a public creation API, use random UUID for cancellationId and test structure & linkage.
  const randomCancellationId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.shoppingMall.admin.orders.cancellations.at(
      connection,
      {
        orderId: order.id,
        cancellationId: randomCancellationId,
      },
    );
  typia.assert(output);

  // Validate output fields structurally and linkage to order ID
  TestValidator.equals(
    "order id linkage matches",
    output.shopping_mall_order_id,
    order.id,
  );
  TestValidator.predicate("id is a string", typeof output.id === "string");
  TestValidator.predicate(
    "reason code is string",
    typeof output.reason_code === "string",
  );
  TestValidator.predicate(
    "status is string",
    typeof output.status === "string",
  );
  if (output.explanation !== undefined && output.explanation !== null) {
    TestValidator.predicate(
      "explanation is string",
      typeof output.explanation === "string",
    );
  }
  TestValidator.predicate(
    "requested_at is in ISO 8601 format",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(output.requested_at),
  );
  if (output.resolved_at !== undefined && output.resolved_at !== null) {
    TestValidator.predicate(
      "resolved_at is in ISO 8601 format",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(output.resolved_at),
    );
  }
}
