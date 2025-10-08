import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAppeal";
import type { IShoppingMallEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalation";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a seller can access the detailed information of an appeal that
 * they have submitted.
 *
 * Steps:
 *
 * 1. Register a new seller.
 * 2. Create a shipping address snapshot.
 * 3. Create a payment method snapshot.
 * 4. Create an order pointing to the address and payment method.
 * 5. Create an escalation for the order.
 * 6. As the seller, submit an appeal referenced to the escalation.
 * 7. Access the /shoppingMall/seller/appeals/{appealId} endpoint as the appellant
 *    seller.
 *
 *    - Confirm response is the correct appeal.
 *    - Validate presence and correct linkage of all required fields: escalation_id,
 *         appellant_seller_id, status, type, timestamps, etc.
 *    - Confirm no sensitive/leaked fields or missing business-required fields.
 *
 * Edge case: 8. Register a second seller, attempt to access the prior seller's
 * appeal detail endpoint; expect error.
 */
export async function test_api_appeal_detail_access_by_seller(
  connection: api.IConnection,
) {
  // Register seller A
  const sellerAJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: sellerAJoinData,
  });
  typia.assert(sellerA);

  // Create order address
  const orderAddressData = {
    address_type: "shipping",
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    address_main: RandomGenerator.paragraph({ sentences: 3 }),
    address_detail: RandomGenerator.paragraph({ sentences: 2 }),
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: orderAddressData },
    );
  typia.assert(orderAddress);

  // Create payment method snapshot (admin only)
  const paymentMethodData = {
    payment_method_type: "card",
    method_data: '{"card_last4":"1234"}',
    display_name: `Visa ****1234`,
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: paymentMethodData },
    );
  typia.assert(paymentMethod);

  // Create order as customer (assumed seller acts as customer for test purposes)
  const orderData = {
    shipping_address_id: orderAddress.id,
    payment_method_id: paymentMethod.id,
    order_total: 29900,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderData },
  );
  typia.assert(order);

  // Create escalation linked to the order
  const escalationData = {
    shopping_mall_order_id: order.id,
    escalation_type: "order_not_received",
  } satisfies IShoppingMallEscalation.ICreate;
  const escalation =
    await api.functional.shoppingMall.customer.escalations.create(connection, {
      body: escalationData,
    });
  typia.assert(escalation);

  // Seller submits an appeal for the escalation
  const appealData = {
    escalation_id: escalation.id,
    appeal_type: "refund denied",
    explanation: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAppeal.ICreate;
  const appeal = await api.functional.shoppingMall.seller.appeals.create(
    connection,
    { body: appealData },
  );
  typia.assert(appeal);

  // Seller fetches own appeal details
  const fetched = await api.functional.shoppingMall.seller.appeals.at(
    connection,
    { appealId: appeal.id },
  );
  typia.assert(fetched);
  TestValidator.equals("appeal id matches", fetched.id, appeal.id);
  TestValidator.equals(
    "escalation linkage",
    fetched.escalation_id,
    escalation.id,
  );
  TestValidator.equals(
    "appellant seller id matches",
    fetched.appellant_seller_id,
    sellerA.id,
  );
  TestValidator.equals(
    "appeal type matches",
    fetched.appeal_type,
    appealData.appeal_type,
  );
  TestValidator.equals(
    "appeal explanation not leaked (no property)",
    (fetched as any).explanation,
    undefined,
  );
  TestValidator.equals(
    "no deleted_at on active appeal",
    fetched.deleted_at,
    null,
  );

  // Edge case: Register seller B and try to access seller A's appeal (should be forbidden)
  const sellerBjoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: sellerBjoinData,
  });
  typia.assert(sellerB);
  // Try to fetch appeal as seller B (should fail)
  await TestValidator.error(
    "unauthorized seller cannot access another seller's appeal",
    async () => {
      await api.functional.shoppingMall.seller.appeals.at(connection, {
        appealId: appeal.id,
      });
    },
  );
}
