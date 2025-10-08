import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellation";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a seller can access the details of an order cancellation
 * request that belongs to them.
 *
 * 1. Create seller account and ensure typia.assert
 * 2. Create customer account, with initial shipping address, and ensure
 *    typia.assert
 * 3. As customer, add an order address snapshot via API
 * 4. As admin, create a payment method snapshot
 * 5. As customer, place an order using the created address/payment
 * 6. As customer, submit an order cancellation request for that order
 * 7. As seller, retrieve the cancellation detail specifying orderId and
 *    cancellationId
 * 8. Validate that response is correct, IDs line up, and DTO shapes are asserted
 */
export async function test_api_order_cancellation_detail_by_seller(
  connection: api.IConnection,
) {
  // 1. Register the seller (get account and token)
  const sellerPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    kyc_document_uri: null,
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;

  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerPayload,
  });
  typia.assert(sellerAuth);

  // 2. Register the customer (with required address)
  const customerAddress = {
    recipient_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    region: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 20,
    }),
    postal_code: RandomGenerator.alphaNumeric(5),
    address_line1: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 8,
      wordMax: 25,
    }),
    address_line2: null,
    is_default: true,
  } satisfies IShoppingMallCustomerAddress.ICreate;

  const customerPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: customerAddress,
  } satisfies IShoppingMallCustomer.IJoin;

  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerPayload,
  });
  typia.assert(customerAuth);

  // 3. As customer, create order address snapshot (simulate shipping address selection at checkout)
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: customerAddress.recipient_name,
          phone: customerAddress.phone,
          zip_code: customerAddress.postal_code,
          address_main: customerAddress.address_line1,
          address_detail: customerAddress.address_line2,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 4. As admin, create a payment method snapshot
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
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 5. As customer, place the order
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 19900,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. As customer, submit cancellation (use PATCH cancellation index)
  const cancellationIndex =
    await api.functional.shoppingMall.customer.orders.cancellations.index(
      connection,
      {
        orderId: order.id,
        body: {
          orderId: order.id,
          reason_code: "customer_request",
          explanation: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IShoppingMallOrderCancellation.IRequest,
      },
    );
  typia.assert(cancellationIndex);
  TestValidator.predicate(
    "cancellation index returns at least one cancellation record",
    cancellationIndex.data.length > 0,
  );
  const cancellation = cancellationIndex.data[0];
  typia.assert(cancellation);

  // 7. As seller, retrieve cancellation detail (should be present for this order)
  const cancellationDetail =
    await api.functional.shoppingMall.seller.orders.cancellations.at(
      connection,
      {
        orderId: order.id,
        cancellationId: cancellation.id,
      },
    );
  typia.assert(cancellationDetail);

  // 8. Validate returned object has correct associations
  TestValidator.equals(
    "cancellationDetail.shopping_mall_order_id matches order.id",
    cancellationDetail.shopping_mall_order_id,
    order.id,
  );
  TestValidator.equals(
    "cancellationDetail.id matches cancellation.id",
    cancellationDetail.id,
    cancellation.id,
  );
}
