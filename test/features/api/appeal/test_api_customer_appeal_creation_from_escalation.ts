import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAppeal";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalation";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Test the customer appeal creation flow from escalation context.
 *
 * 1. Register a new customer (customer join)
 * 2. Create a shipping address snapshot for the order
 * 3. Create a payment method snapshot for the order
 * 4. Place a new order referencing address/payment snapshots
 * 5. Create an escalation for the order
 * 6. Submit an appeal on that escalation
 *
 * Each step checks resource creation, authentication, and expects success. The
 * appeal must reference the latest escalation and belong to the acting
 * customer. Assert all responses and relations are valid.
 */
export async function test_api_customer_appeal_creation_from_escalation(
  connection: api.IConnection,
) {
  // 1. Register new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 2 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 3 }),
      address_line2: RandomGenerator.paragraph({ sentences: 2 }),
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoinBody,
  });
  typia.assert(customerAuth);

  // 2. Create shipping address snapshot
  const addressBody = {
    address_type: "shipping",
    recipient_name: customerJoinBody.address.recipient_name,
    phone: customerJoinBody.address.phone,
    zip_code: customerJoinBody.address.postal_code,
    address_main: customerJoinBody.address.address_line1,
    address_detail: customerJoinBody.address.address_line2,
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: addressBody },
    );
  typia.assert(orderAddress);

  // 3. Create payment method snapshot
  const paymentBody = {
    payment_method_type: "card",
    method_data: RandomGenerator.alphaNumeric(14),
    display_name: `Visa ****${RandomGenerator.alphaNumeric(4)}`,
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: paymentBody },
    );
  typia.assert(paymentMethod);

  // 4. Place a new order using the above snapshots
  const orderBody = {
    shipping_address_id: orderAddress.id,
    payment_method_id: paymentMethod.id,
    order_total: 15900,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert(order);

  // 5. Create escalation for the order
  const escalationBody = {
    shopping_mall_order_id: order.id,
    escalation_type: "order_not_received",
    resolution_type: "manual_review",
    escalation_status: "pending",
    resolution_comment: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallEscalation.ICreate;
  const escalation =
    await api.functional.shoppingMall.customer.escalations.create(connection, {
      body: escalationBody,
    });
  typia.assert(escalation);

  // 6. Submit appeal for that escalation
  const appealBody = {
    escalation_id: escalation.id,
    appeal_type: "refund denied",
    explanation: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IShoppingMallAppeal.ICreate;
  const appeal = await api.functional.shoppingMall.customer.appeals.create(
    connection,
    { body: appealBody },
  );
  typia.assert(appeal);

  // Business and audit validation
  TestValidator.equals(
    "appeal reference escalation",
    appeal.escalation_id,
    escalation.id,
  );
  TestValidator.equals(
    "appeal appellant customer",
    appeal.appellant_customer_id,
    customerAuth.id,
  );
  TestValidator.equals(
    "appeal status is pending",
    appeal.appeal_status,
    "pending",
  );
  TestValidator.predicate(
    "appeal has date fields",
    typeof appeal.created_at === "string" &&
      typeof appeal.updated_at === "string",
  );
}
