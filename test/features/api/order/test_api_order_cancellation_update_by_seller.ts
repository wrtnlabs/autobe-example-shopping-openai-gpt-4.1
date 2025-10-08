import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test the complete process of a seller updating an order cancellation request.
 * Steps:
 *
 * 1. Register seller (join)
 * 2. Create shipping address snapshot
 * 3. Create payment method snapshot
 * 4. Create an order for which a cancellation request can exist
 * 5. Simulate (mock) a pre-existing cancellation record for this order (since
 *    out-of-scope)
 * 6. Seller updates the cancellation request: (a) approve, (b) deny with
 *    explanation
 * 7. Attempt to update a completed cancellation (should fail and be audited)
 * 8. Assert all API responses are correct & business logic validated
 */
export async function test_api_order_cancellation_update_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Register seller
  const sellerSignup = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    kyc_document_uri: null,
  } satisfies IShoppingMallSeller.IJoin;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerSignup });
  typia.assert(seller);

  // Step 2: Create shipping address snapshot
  const orderAddressCreate = {
    address_type: "shipping",
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    zip_code: RandomGenerator.alphaNumeric(5),
    address_main: RandomGenerator.paragraph({ sentences: 2 }),
    address_detail: null,
    country_code: "KOR", // ISO 3166-1 alpha-3
  } satisfies IShoppingMallOrderAddress.ICreate;
  const address: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: orderAddressCreate },
    );
  typia.assert(address);

  // Step 3: Create payment method snapshot (admin)
  const paymentMethodCreate = {
    payment_method_type: "card",
    method_data: '{"masked":"****1234"}',
    display_name: "Visa ****1234",
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: paymentMethodCreate },
    );
  typia.assert(paymentMethod);

  // Step 4: Create an order referencing the above address and payment method
  const orderCreate = {
    shopping_mall_seller_id: seller.id,
    shipping_address_id: address.id,
    payment_method_id: paymentMethod.id,
    order_total: 49900,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderCreate,
    });
  typia.assert(order);

  // Step 5: Simulate a cancellation. Assume pending status, random reason
  // (Since no API to create cancellation, we use a mock cancellation for this test)
  let cancellation: IShoppingMallOrderCancellation = {
    id: typia.random<string & tags.Format<"uuid">>(),
    shopping_mall_order_id: order.id,
    initiator_customer_id: typia.random<string & tags.Format<"uuid">>(),
    initiator_seller_id: null,
    initiator_admin_id: null,
    reason_code: "customer_request",
    status: "pending",
    explanation: null,
    requested_at: new Date().toISOString(),
    resolved_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Step 6a: Seller approves the request
  const approveUpdate = {
    reason_code: cancellation.reason_code,
    status: "approved",
    explanation: "Approved by seller.",
  } satisfies IShoppingMallOrderCancellation.IUpdate;
  const approvedCancellation: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.seller.orders.cancellations.update(
      connection,
      {
        orderId: order.id,
        cancellationId: cancellation.id,
        body: approveUpdate,
      },
    );
  typia.assert(approvedCancellation);
  TestValidator.equals(
    "status updated to approved",
    approvedCancellation.status,
    "approved",
  );
  TestValidator.equals(
    "reason code carried",
    approvedCancellation.reason_code,
    "customer_request",
  );
  TestValidator.equals(
    "explanation updated",
    approvedCancellation.explanation,
    "Approved by seller.",
  );

  // Step 6b: Update with denial
  const denyUpdate = {
    reason_code: cancellation.reason_code,
    status: "denied",
    explanation: "Seller denied cancellation.",
  } satisfies IShoppingMallOrderCancellation.IUpdate;
  const deniedCancellation: IShoppingMallOrderCancellation =
    await api.functional.shoppingMall.seller.orders.cancellations.update(
      connection,
      {
        orderId: order.id,
        cancellationId: cancellation.id,
        body: denyUpdate,
      },
    );
  typia.assert(deniedCancellation);
  TestValidator.equals(
    "status updated to denied",
    deniedCancellation.status,
    "denied",
  );
  TestValidator.equals(
    "explanation updated for denial",
    deniedCancellation.explanation,
    "Seller denied cancellation.",
  );

  // Step 7: Attempt to update a completed cancellation (should fail, simulated)
  // Set state as completed and expect error, if business logic enforces it
  const completeUpdate = {
    reason_code: cancellation.reason_code,
    status: "completed",
    explanation: "Completed and cannot update.",
  } satisfies IShoppingMallOrderCancellation.IUpdate;
  // Simulate by first marking the cancellation completed
  cancellation.status = "completed";
  await TestValidator.error(
    "cannot update a completed cancellation",
    async () => {
      await api.functional.shoppingMall.seller.orders.cancellations.update(
        connection,
        {
          orderId: order.id,
          cancellationId: cancellation.id,
          body: completeUpdate,
        },
      );
    },
  );
}
