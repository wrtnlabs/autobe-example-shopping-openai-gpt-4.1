import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAppeal";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAppeal";
import type { IShoppingMallEscalation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallEscalation";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Verify admin advanced appeal listing and filtering for escalated orders.
 *
 * 1. Register & login as a system admin
 * 2. Create order address (shipping)
 * 3. Create order payment method snapshot
 * 4. Create order referencing the above snapshots
 * 5. Create customer escalation for this order
 * 6. File a new customer appeal linked to the escalation
 * 7. As admin, perform PATCH /shoppingMall/admin/appeals with filter and
 *    pagination params
 * 8. Confirm the created appeal appears in results and all relevant metadata is
 *    present
 * 9. Test filtering (status/type/outcome/actor) for positive hit and for empty
 *    result
 * 10. Validate edge cases with invalid/non-matching filter
 */
export async function test_api_appeals_admin_search_and_review(
  connection: api.IConnection,
) {
  // Step 1: Admin registration and login (receive JWT in response)
  const adminRegistrationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(14),
    full_name: RandomGenerator.name(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminRegistrationBody,
  });
  typia.assert(adminAuth);

  // Step 2: Customer order address snapshot
  const addressBody = {
    address_type: "shipping",
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    address_main: RandomGenerator.paragraph({ sentences: 3 }),
    address_detail: RandomGenerator.paragraph({ sentences: 2 }),
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const address =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: addressBody },
    );
  typia.assert(address);

  // Step 3: Payment method snapshot
  const paymentBody = {
    payment_method_type: RandomGenerator.pick([
      "card",
      "bank_transfer",
      "paypal",
      "virtual_account",
    ] as const),
    method_data: RandomGenerator.alphaNumeric(16),
    display_name: "Visa ****1234",
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: paymentBody },
    );
  typia.assert(paymentMethod);

  // Step 4: Create an order
  const orderBody = {
    shipping_address_id: address.id,
    payment_method_id: paymentMethod.id,
    order_total: 33000,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert(order);

  // Step 5: Escalation
  const escalationBody = {
    shopping_mall_order_id: order.id,
    escalation_type: RandomGenerator.pick([
      "order_not_received",
      "refund_denied",
      "payment_dispute",
    ] as const),
    resolution_type: "manual_review",
    escalation_status: "pending",
    resolution_comment: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallEscalation.ICreate;
  const escalation =
    await api.functional.shoppingMall.customer.escalations.create(connection, {
      body: escalationBody,
    });
  typia.assert(escalation);

  // Step 6: Appeal (customer-initiated)
  const appealBody = {
    escalation_id: escalation.id,
    appeal_type: "refund denied",
    explanation:
      "The refund should be reconsidered due to exceptional circumstances.",
  } satisfies IShoppingMallAppeal.ICreate;
  const appeal = await api.functional.shoppingMall.customer.appeals.create(
    connection,
    { body: appealBody },
  );
  typia.assert(appeal);

  // Step 7: List appeals as admin, check metadata and links
  const appealRequestBody = {
    escalation_id: escalation.id,
    appeal_type: "refund denied",
    comment:
      "The refund should be reconsidered due to exceptional circumstances.",
  } satisfies IShoppingMallAppeal.IRequest;
  const paged = await api.functional.shoppingMall.admin.appeals.index(
    connection,
    { body: appealRequestBody },
  );
  typia.assert(paged);

  TestValidator.predicate(
    "appeal appears in admin paginated search result",
    paged.data.some((row) => row.id === appeal.id),
  );

  // Validate returned appeal metadata against schema for all results
  paged.data.forEach((result) => {
    typia.assert<IShoppingMallAppeal>(result);
    TestValidator.equals(
      "result escalation id matches",
      result.escalation_id,
      escalation.id,
    );
    TestValidator.equals(
      "result appeal type matches",
      result.appeal_type,
      appeal.appeal_type,
    );
    // Additional business checks can be added if needed
  });

  // Step 8: Test filter with non-matching outcome
  const noResultBody = {
    escalation_id: escalation.id,
    appeal_type: "policy review request",
    comment: "Non-matching filter",
  } satisfies IShoppingMallAppeal.IRequest;
  const pagedEmpty = await api.functional.shoppingMall.admin.appeals.index(
    connection,
    { body: noResultBody },
  );
  typia.assert(pagedEmpty);
  TestValidator.equals(
    "empty appeal result with non-matching filter",
    pagedEmpty.data.length,
    0,
  );
}
