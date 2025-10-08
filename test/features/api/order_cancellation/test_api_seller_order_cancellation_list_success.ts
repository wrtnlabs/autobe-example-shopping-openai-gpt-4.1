import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellation";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that a seller can retrieve a paginated and filtered list of all
 * cancellation requests associated with a specific order.
 *
 * The test prepares all dependencies: admin account (for payment method, order
 * admin ops), seller account (for cancellation index queries), customer account
 * (for order creation), order address and payment method snapshot creation,
 * actual order creation, and at least one cancellation entry. After
 * cancellation entry is present, the seller queries for the cancellation list
 * with expected filters and pagination.
 *
 * Steps:
 *
 * 1. Register admin & login (to create payment method & set up dependencies).
 * 2. Register seller & login.
 * 3. Register customer with address.
 * 4. Admin creates payment method snapshot.
 * 5. Customer creates order address snapshot.
 * 6. Customer creates order with address & payment method.
 * 7. Customer submits a cancellation request for the order.
 * 8. Seller queries cancellation index for the order.
 * 9. Validate response contains at least the submitted cancellation, pagination
 *    schema is valid, and business logic is respected (e.g., relevant
 *    cancellations only).
 * 10. Check that unauthorized access is denied with error.
 */
export async function test_api_seller_order_cancellation_list_success(
  connection: api.IConnection,
) {
  // Step 1. Register admin and login
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
        status: "active",
      },
    });
  typia.assert(admin);

  // Step 2. Register seller and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(12),
        business_name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        contact_name: RandomGenerator.name(1),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(10),
      },
    });
  typia.assert(seller);

  // Step 3. Register customer (with address)
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12) as string &
          tags.MinLength<8> &
          tags.MaxLength<100>,
        full_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(2),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.paragraph({ sentences: 1 }),
          postal_code: RandomGenerator.alphaNumeric(5),
          address_line1: RandomGenerator.paragraph({ sentences: 2 }),
          address_line2: null,
          is_default: true,
        },
      },
    });
  typia.assert(customer);

  // Step 4. Admin creates payment method snapshot
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: JSON.stringify({ masked: "****-****-****-1234" }),
          display_name: "Visa ****1234",
        },
      },
    );
  typia.assert(paymentMethod);

  // Step 5. Customer creates shipping address snapshot
  const shippingAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(2),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: null,
          country_code: "KOR",
        },
      },
    );
  typia.assert(shippingAddress);

  // Step 6. Customer creates an order
  const orderInput = {
    shipping_address_id: shippingAddress.id,
    payment_method_id: paymentMethod.id,
    order_total: 50000,
    currency: "KRW",
  };
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: orderInput,
    });
  typia.assert(order);

  // Step 7. Customer submits a cancellation request for the order
  // (Assuming at least one cancellation is required for valid test)
  const cancellationRequest = {
    orderId: order.id,
    reason_code: "customer_request",
    explanation: "I want to cancel for personal reason.",
  } satisfies IShoppingMallOrderCancellation.IRequest;

  // As customer, request cancellation by posting to the index endpoint (emulating customer-initiated; in real, there'd be a separate endpoint, but SDK exposes only this one for PATCH by sellers for test)
  // For the test, we can post it as the seller, since only the PATCH cancellation index API is available. The test is limited by available endpoints.
  await api.functional.shoppingMall.seller.orders.cancellations.index(
    connection,
    {
      orderId: order.id,
      body: cancellationRequest,
    },
  );

  // Step 8. Seller queries cancellation index for the order
  // Use filters matching the cancellation just created
  const filterBody = {
    orderId: order.id,
    reason_code: "customer_request",
    explanation: undefined,
  } satisfies IShoppingMallOrderCancellation.IRequest;

  const result: IPageIShoppingMallOrderCancellation =
    await api.functional.shoppingMall.seller.orders.cancellations.index(
      connection,
      {
        orderId: order.id,
        body: filterBody,
      },
    );
  typia.assert(result);

  // Step 9. Validate: At least one cancellation exists for the order
  TestValidator.predicate(
    "At least one cancellation is returned for the order",
    () => Array.isArray(result.data) && result.data.length >= 1,
  );
  TestValidator.equals(
    "Cancellation reason_code matches filter",
    result.data[0]?.reason_code,
    "customer_request",
  );
  TestValidator.equals(
    "Cancellation order id matches",
    result.data[0]?.shopping_mall_order_id,
    order.id,
  );
  typia.assert(result.pagination);

  // Step 10. Unauthorized access should be denied
  // Remove headers for unauthenticated request (simulate logout)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "Unauthorized seller order cancellation index should fail",
    async () => {
      await api.functional.shoppingMall.seller.orders.cancellations.index(
        unauthConn,
        {
          orderId: order.id,
          body: filterBody,
        },
      );
    },
  );
}
