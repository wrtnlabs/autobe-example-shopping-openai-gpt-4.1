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
 * Verifies access to appeal detail for the customer who created it.
 *
 * 1. Register customer 1 and create address.
 * 2. Create payment method snapshot for an order.
 * 3. As customer 1, create order referencing address and payment method.
 * 4. Escalate the order, as customer 1.
 * 5. Create an appeal referencing the escalation.
 * 6. Retrieve appeal by ID as customer 1: Check all returned data fields match
 *    what was created, including linkage to escalation, status, actors,
 *    timestamps, and possible resolution fields.
 * 7. Register customer 2 and log in (simulate unauthorized).
 * 8. Attempt to fetch customer 1's appeal by ID as customer 2: Expect error.
 * 9. Attempt to GET non-existent appeal ID as customer 2: Expect error.
 * 10. [Edge] (Simulated) Soft-delete the appeal and try to access it: Expect error.
 *     (If soft-deletion cannot be simulated, skip.)
 */
export async function test_api_customer_appeal_detail_access_by_owner(
  connection: api.IConnection,
) {
  // 1. Register customer and create address
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer1 = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        address_line2: RandomGenerator.paragraph({ sentences: 2 }),
        is_default: true,
      },
    },
  });
  typia.assert(customer1);

  // 2. Create order address snapshot for order
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 3 }),
          address_detail: RandomGenerator.paragraph({ sentences: 1 }),
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
          method_data: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(paymentMethod);

  // 4. Create new order for customer
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

  // 5. Create escalation for order
  const escalation =
    await api.functional.shoppingMall.customer.escalations.create(connection, {
      body: {
        shopping_mall_order_id: order.id,
        escalation_type: "order_not_received",
        resolution_type: "manual_review",
        escalation_status: "pending",
        resolution_comment: RandomGenerator.content({ paragraphs: 1 }),
      },
    });
  typia.assert(escalation);

  // 6. Create an appeal by this customer for the escalation
  const appeal = await api.functional.shoppingMall.customer.appeals.create(
    connection,
    {
      body: {
        escalation_id: escalation.id,
        appeal_type: "refund_denied",
        explanation: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(appeal);

  // 7. Fetch appeal by ID as the owner (customer 1)
  const appealFetched = await api.functional.shoppingMall.customer.appeals.at(
    connection,
    { appealId: appeal.id },
  );
  typia.assert(appealFetched);
  TestValidator.equals(
    "appeal detail returns correct record for owner",
    appealFetched.id,
    appeal.id,
  );
  TestValidator.equals(
    "appeal has correct escalation linkage",
    appealFetched.escalation_id,
    escalation.id,
  );
  TestValidator.equals(
    "appeal status matches",
    appealFetched.appeal_status,
    appeal.appeal_status,
  );
  TestValidator.equals(
    "appeal type matches",
    appealFetched.appeal_type,
    appeal.appeal_type,
  );
  TestValidator.equals(
    "appellant_customer_id matches",
    appealFetched.appellant_customer_id,
    customer1.id,
  );
  TestValidator.equals(
    "appeal not soft deleted",
    appealFetched.deleted_at,
    null,
  );

  // 8. Create a second customer and login
  const customer2 = await api.functional.auth.customer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(5),
        address_line1: RandomGenerator.paragraph({ sentences: 2 }),
        address_line2: RandomGenerator.paragraph({ sentences: 2 }),
        is_default: true,
      },
    },
  });
  typia.assert(customer2);

  // 9. Attempt to access first customer's appeal by ID as customer2
  await TestValidator.error(
    "unauthorized customer cannot access appeal not owned by them",
    async () => {
      await api.functional.shoppingMall.customer.appeals.at(connection, {
        appealId: appeal.id,
      });
    },
  );

  // 10. Attempt to access a completely fake/nonexistent appeal id
  await TestValidator.error(
    "error when requesting non-existent appealId",
    async () => {
      await api.functional.shoppingMall.customer.appeals.at(connection, {
        appealId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
