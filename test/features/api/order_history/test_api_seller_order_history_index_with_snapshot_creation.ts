import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderHistory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validates that after a customer creates an order for a seller's product, the
 * seller can retrieve order history snapshots related to that order via
 * paginated, filtered search.
 *
 * Steps:
 *
 * 1. Register a seller and a customer.
 * 2. Customer creates an immutable order address snapshot.
 * 3. Admin creates a payment method snapshot for the order.
 * 4. Customer creates an order referencing the above snapshots.
 * 5. Seller indexes order history snapshots for the created order.
 * 6. Validate the order history list contains at least one record matching this
 *    order id.
 */
export async function test_api_seller_order_history_index_with_snapshot_creation(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerEmail = RandomGenerator.alphaNumeric(8) + "@mall.com";
  const sellerRegNum = RandomGenerator.alphaNumeric(12);
  const sellerResult = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "SeLLer!123",
      business_name: RandomGenerator.name(2),
      contact_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      kyc_document_uri: null,
      business_registration_number: sellerRegNum,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerResult);

  // 2. Register a customer
  const customerEmail = RandomGenerator.alphaNumeric(8) + "@customer.com";
  const customerResult = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "CuSTOMer123!",
      full_name: RandomGenerator.name(2),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        region: "Seoul",
        postal_code: "12345",
        address_line1: "100 Main St",
        address_line2: "Apt 101",
        is_default: true,
      },
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerResult);

  // 3. Customer creates order address snapshot
  const orderAddressResult =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(2),
          phone: RandomGenerator.mobile(),
          zip_code: "12345",
          address_main: "100 Main St",
          address_detail: "Apt 101",
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddressResult);

  // 4. Admin creates order payment method
  const paymentMethodResult =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: '{"type":"card","card":"****1111"}',
          display_name: "Visa ****1111",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethodResult);

  // 5. Customer creates an order
  const orderResult = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerResult.id,
        shipping_address_id: orderAddressResult.id,
        payment_method_id: paymentMethodResult.id,
        order_total: 20000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(orderResult);

  // 6. Seller queries order history snapshots for this order
  const snapshotHistoryResult =
    await api.functional.shoppingMall.seller.orderHistories.index(connection, {
      body: {
        order_id: orderResult.id,
        page: 1,
        limit: 10,
      } satisfies IShoppingMallOrderHistory.IRequest,
    });
  typia.assert(snapshotHistoryResult);
  // Should find at least one snapshot for that order id
  const hasOrderSnapshot = snapshotHistoryResult.data.some(
    (h) => h.shopping_mall_order_id === orderResult.id,
  );
  TestValidator.predicate(
    "order history includes snapshot for the new order",
    hasOrderSnapshot,
  );
}
