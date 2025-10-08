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
 * Verifies successful customer escalation creation workflow:
 *
 * 1. Register a new customer (unique credentials, initial address)
 * 2. Create an immutable order address snapshot for the customer
 * 3. Create a payment method snapshot for the order
 * 4. Place a new order with the address/payment method snapshots
 * 5. Create a customer escalation (e.g. 'order_not_received') referencing the
 *    order
 * 6. Validate all escalation fields, initial status, audit/compliance timestamps,
 *    and order linkage
 */
export async function test_api_customer_escalation_creation_success(
  connection: api.IConnection,
) {
  // 1. Register a new customer (unique credentials, plus address)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(12);
  const customerName = RandomGenerator.name();
  const customerPhone = RandomGenerator.mobile();
  const initialCustomerAddress = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: null,
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;
  const joinResult = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: customerPassword satisfies string,
      full_name: customerName,
      phone: customerPhone,
      address: initialCustomerAddress,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResult);

  // 2. Create an immutable order address snapshot
  const addressSnapshot =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 3 }),
          address_detail: null,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(addressSnapshot);

  // 3. Create a payment method snapshot
  const paymentMethodSnapshot =
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
          method_data: RandomGenerator.paragraph(),
          display_name: RandomGenerator.name(2),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethodSnapshot);

  // 4. Place an order using the snapshotted address and payment method
  const randomCurrency = RandomGenerator.pick(["KRW", "USD", "JPY"] as const);
  const randomOrderTotal = Math.floor(Math.random() * 100000) + 5000;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: addressSnapshot.id,
        payment_method_id: paymentMethodSnapshot.id,
        order_total: randomOrderTotal,
        currency: randomCurrency,
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 5. Create an escalation related to this order (e.g., 'order_not_received')
  const escalationType = "order_not_received";
  const escalationResolutionComment = RandomGenerator.paragraph({
    sentences: 3,
  });
  const escalationCreateBody = {
    shopping_mall_order_id: order.id,
    escalation_type: escalationType,
    resolution_comment: escalationResolutionComment,
  } satisfies IShoppingMallEscalation.ICreate;
  const escalation =
    await api.functional.shoppingMall.customer.escalations.create(connection, {
      body: escalationCreateBody,
    });
  typia.assert(escalation);

  // 6. Validate escalation fields
  TestValidator.equals(
    "escalation linked to correct order",
    escalation.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "escalation type correct",
    escalation.escalation_type,
    escalationType,
  );
  TestValidator.equals(
    "escalation initial status is pending",
    escalation.escalation_status,
    "pending",
  );
  TestValidator.predicate(
    "escalation timestamps valid",
    typeof escalation.created_at === "string" &&
      escalation.created_at.length > 0 &&
      typeof escalation.updated_at === "string" &&
      escalation.updated_at.length > 0,
  );
  TestValidator.equals(
    "resolution comment matches",
    escalation.resolution_comment,
    escalationResolutionComment,
  );
}
