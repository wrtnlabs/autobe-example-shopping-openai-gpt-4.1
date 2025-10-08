import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalation";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates the complete seller escalation process for the shopping mall
 * platform. Ensures a new seller can register, a new order with address &
 * payment is created, and the seller can escalate an issue linked to that
 * order. All business, linkage, and audit requirements are asserted.
 *
 * 1. Register a new seller account (onboarding, unique email/BRN, all required
 *    fields)
 * 2. Create an order address snapshot for shipping (immutable, point-in-time
 *    fields)
 * 3. Create payment method snapshot (type, method_data, display_name)
 * 4. Create an order using the above address and payment method
 * 5. Seller triggers escalation using a chosen reason/type
 * 6. Assert escalation response: correct status/type, links to order, has seller
 *    initiator, no admin/resolution yet
 */
export async function test_api_seller_escalation_creation_success(
  connection: api.IConnection,
) {
  // 1. Register a new seller (onboarding)
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.name(2),
    contact_name: RandomGenerator.name(2),
    phone: RandomGenerator.mobile(),
    kyc_document_uri: null,
    business_registration_number: `${RandomGenerator.alphaNumeric(6)}-${RandomGenerator.alphaNumeric(3)}-${RandomGenerator.alphaNumeric(5)}`,
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);

  // 2. Create order address snapshot
  const orderAddressBody = {
    address_type: "shipping",
    recipient_name: RandomGenerator.name(1),
    phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    address_main: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 10,
    }),
    address_detail: null,
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: orderAddressBody },
    );
  typia.assert(orderAddress);

  // 3. Create payment method snapshot
  const paymentBody = {
    payment_method_type: RandomGenerator.pick([
      "card",
      "bank_transfer",
      "paypal",
      "virtual_account",
    ] as const),
    method_data: RandomGenerator.paragraph({ sentences: 5 }),
    display_name: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: paymentBody },
    );
  typia.assert(paymentMethod);

  // 4. Create order referencing these address/payment snapshots and the seller
  const orderBody = {
    shopping_mall_customer_id: typia.random<string & tags.Format<"uuid">>(), // Test as admin-placed order for testability
    shopping_mall_seller_id: sellerAuth.id,
    shipping_address_id: orderAddress.id,
    payment_method_id: paymentMethod.id,
    order_total: 10000,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const createdOrder = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert(createdOrder);

  // 5. Seller creates/initiates an escalation for the order
  const escalationBody = {
    shopping_mall_order_id: createdOrder.id,
    escalation_type: RandomGenerator.pick([
      "order_not_received",
      "payment_dispute",
      "refund_denied",
      "compliance_inquiry",
    ] as const),
    resolution_type: undefined,
    escalation_status: undefined,
    resolution_comment: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallEscalation.ICreate;
  const escalation =
    await api.functional.shoppingMall.seller.escalations.create(connection, {
      body: escalationBody,
    });
  typia.assert(escalation);

  // 6. Assertions: linkage, status, initiator
  TestValidator.equals(
    "escalation order_id matches",
    escalation.shopping_mall_order_id,
    createdOrder.id,
  );
  TestValidator.equals(
    "escalation initiator_seller_id matches",
    escalation.initiator_seller_id,
    sellerAuth.id,
  );
  TestValidator.equals(
    "escalation assigned_admin_id should be null",
    escalation.assigned_admin_id,
    null,
  );
  TestValidator.equals(
    "escalation resolution_type should be null or undefined",
    escalation.resolution_type,
    null,
  );
  TestValidator.predicate(
    "escalation_type and status are set",
    escalation.escalation_type.length > 0 &&
      escalation.escalation_status.length > 0,
  );
  TestValidator.predicate(
    "escalation timestamps are present",
    typeof escalation.created_at === "string" &&
      typeof escalation.updated_at === "string",
  );
}
