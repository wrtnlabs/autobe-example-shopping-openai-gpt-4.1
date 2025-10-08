import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerServiceEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerServiceEvent";
import type { IShoppingMallEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalation";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";

/**
 * Validate customer retrieval of their own customer service event, proper
 * forbidden/not-found errors.
 *
 * 1. Register (join) a new customer.
 * 2. Place an order for the customer (minimal required fields).
 * 3. Create escalation for the placed order.
 * 4. Retrieve the just-created service event (by eventId from escalation response,
 *    or via linked id if present).
 * 5. Assert all event/detail fields: actor_customer_id matches, event type/status
 *    non-empty, timestamps, etc.
 * 6. Register a second customer (different credentials), attempt to retrieve the
 *    same service event (forbidden).
 * 7. Attempt to retrieve a random (non-existent) eventId (not-found).
 */
export async function test_api_customer_service_event_retrieval_by_customer(
  connection: api.IConnection,
) {
  // 1. Register primary customer & authenticate
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoinReq = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: "Seoul",
      postal_code: "10000",
      address_line1: "123 Main St",
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerJoinReq,
  });
  typia.assert(customerAuth);
  TestValidator.equals(
    "joined customer email",
    customerAuth.email,
    customerEmail,
  );

  // 2. Place an order for customer (simulate necessary field population for order creation)
  const shipping_address_id = typia.random<string & tags.Format<"uuid">>();
  const payment_method_id = typia.random<string & tags.Format<"uuid">>();
  const orderTotal = 10000;
  const orderCurrency = "KRW";
  const orderCreateReq = {
    shipping_address_id,
    payment_method_id,
    order_total: orderTotal,
    currency: orderCurrency,
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderCreateReq },
  );
  typia.assert(order);
  TestValidator.equals("order currency", order.currency, "KRW");
  TestValidator.equals("order total", order.order_total, orderTotal);

  // 3. Create escalation for the order
  const escalationType = RandomGenerator.pick([
    "order_not_received",
    "refund_denied",
    "payment_dispute",
  ] as const);
  const escalationCreateReq = {
    shopping_mall_order_id: order.id,
    escalation_type: escalationType,
    resolution_comment: RandomGenerator.paragraph(),
  } satisfies IShoppingMallEscalation.ICreate;
  const escalation =
    await api.functional.shoppingMall.customer.escalations.create(connection, {
      body: escalationCreateReq,
    });
  typia.assert(escalation);
  TestValidator.equals(
    "escalation order linkage",
    escalation.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "escalation type",
    escalation.escalation_type,
    escalationType,
  );

  // 4. Retrieve associated customer service event by escalation id as eventId (simulate linkage)
  const eventId = escalation.id satisfies string as string;
  const event =
    await api.functional.shoppingMall.customer.customerServiceEvents.at(
      connection,
      { eventId },
    );
  typia.assert(event);
  TestValidator.equals("event id matches escalation id", event.id, eventId);
  TestValidator.equals(
    "actor_customer_id matches",
    event.actor_customer_id,
    customerAuth.id,
  );
  TestValidator.equals(
    "event escalation linkage",
    event.shopping_mall_escalation_id,
    escalation.id,
  );
  TestValidator.predicate(
    "event_type non-empty",
    !!event.event_type && typeof event.event_type === "string",
  );
  TestValidator.predicate(
    "event_status non-empty",
    !!event.event_status && typeof event.event_status === "string",
  );
  TestValidator.predicate(
    "created_at is string with date-time format",
    typeof event.created_at === "string",
  );
  if (event.event_comment !== null && event.event_comment !== undefined) {
    TestValidator.predicate(
      "event_comment is string when present",
      typeof event.event_comment === "string",
    );
  }

  // 5. Register a second customer, attempt to retrieve same event (must fail with forbidden)
  const otherEmail = typia.random<string & tags.Format<"email">>();
  const otherJoinReq = {
    email: otherEmail,
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: "Busan",
      postal_code: "20000",
      address_line1: "456 Secondary Rd",
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const otherAuth = await api.functional.auth.customer.join(connection, {
    body: otherJoinReq,
  });
  typia.assert(otherAuth);
  await TestValidator.error(
    "forbidden: other customer cannot access primary customer's service event",
    async () => {
      await api.functional.shoppingMall.customer.customerServiceEvents.at(
        connection,
        { eventId },
      );
    },
  );

  // 6. Use non-existent eventId (should yield not-found)
  const nonexistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "not-found: accessing non-existent customer service event",
    async () => {
      await api.functional.shoppingMall.customer.customerServiceEvents.at(
        connection,
        { eventId: nonexistentId },
      );
    },
  );
}
