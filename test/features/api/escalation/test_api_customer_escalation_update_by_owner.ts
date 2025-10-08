import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalation";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Test updating an escalation case by the customer who owns it.
 *
 * 1. Register a customer (join).
 * 2. Create shipping address snapshot for the order.
 * 3. Create order payment method snapshot for payment.
 * 4. Create an order referencing the above snapshots.
 * 5. File an escalation for the created order.
 * 6. As the escalation owner/customer, update escalation with new status and
 *    resolution_comment.
 * 7. Validate the update, status value, comment persistence.
 */
export async function test_api_customer_escalation_update_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a customer with required fields and address
  const joinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(1),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 1 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 2 }),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinData,
  });
  typia.assert(customer);

  // 2. Create an immutable order address snapshot for the order
  const orderAddrSnapshot =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: joinData.address.recipient_name,
          phone: joinData.address.phone,
          zip_code: joinData.address.postal_code,
          address_main: joinData.address.address_line1,
          address_detail: joinData.address.address_line2,
          country_code: "KOR",
        },
      },
    );
  typia.assert(orderAddrSnapshot);

  // 3. Create an order payment method snapshot
  const payMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(16),
          display_name: "Visa ****1234",
        },
      },
    );
  typia.assert(payMethod);

  // 4. Create an order as customer
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddrSnapshot.id,
        payment_method_id: payMethod.id,
        order_total: 10000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 5. File an escalation for the created order
  const escalation =
    await api.functional.shoppingMall.seller.escalations.create(connection, {
      body: {
        shopping_mall_order_id: order.id,
        escalation_type: "order_not_received",
        resolution_type: undefined,
        escalation_status: undefined,
        resolution_comment: RandomGenerator.paragraph({ sentences: 3 }),
      },
    });
  typia.assert(escalation);

  // 6. Update escalation as owner/customer
  const updateBody = {
    escalation_status: "in-review",
    resolution_comment: RandomGenerator.content({ paragraphs: 1 }),
  } satisfies IShoppingMallEscalation.IUpdate;
  const updated = await api.functional.shoppingMall.customer.escalations.update(
    connection,
    {
      escalationId: escalation.id,
      body: updateBody,
    },
  );
  typia.assert(updated);

  // 7. Validate update: status, owner can update, comment persists
  TestValidator.equals(
    "escalation ID remains after update",
    updated.id,
    escalation.id,
  );
  TestValidator.equals(
    "shopping_mall_order_id unchanged",
    updated.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "updated escalation_status",
    updated.escalation_status,
    updateBody.escalation_status,
  );
  TestValidator.equals(
    "updated comment",
    updated.resolution_comment,
    updateBody.resolution_comment,
  );
  TestValidator.predicate(
    "owner remains same",
    updated.initiator_customer_id === customer.id,
  );
}
