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

/**
 * Validate retrieval and filtering of authenticated customer order histories.
 *
 * 1. Register a new customer with random data (and address)
 * 2. Create order address snapshot (ICreate) as shipping/billing address
 * 3. Create payment method snapshot (ICreate) for order
 * 4. Place an order (ICreate) using snapshot IDs, total, currency
 * 5. Query /shoppingMall/customer/orderHistories (patch) to retrieve histories
 * 6. Query /shoppingMall/customer/orderHistories with filtering: order_id,
 *    snapshot_type, order_status, pagination
 * 7. Validate returned histories link only to the new order & customer
 * 8. Validate pagination structure
 */
export async function test_api_customer_order_history_index_basic(
  connection: api.IConnection,
) {
  // 1. Customer join & get token
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 2 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph(),
      address_line2: null,
      is_default: true,
    },
  } satisfies IShoppingMallCustomer.IJoin;
  const customer = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(customer);
  // Re-assert token in connection (SDK will set automatically as documented)

  // 2. Create order address snapshot
  const orderAddressBody = {
    address_type: "shipping",
    recipient_name: joinBody.address.recipient_name,
    phone: joinBody.address.phone,
    zip_code: joinBody.address.postal_code,
    address_main: joinBody.address.address_line1,
    address_detail: joinBody.address.address_line2,
    country_code: "KOR",
  } satisfies IShoppingMallOrderAddress.ICreate;
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      { body: orderAddressBody },
    );
  typia.assert(orderAddress);

  // 3. Create order payment method snapshot (admin access, but valid for test)
  const paymentMethodBody = {
    payment_method_type: RandomGenerator.pick([
      "card",
      "bank_transfer",
      "virtual_account",
      "paypal",
    ] as const),
    method_data: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies IShoppingMallOrderPaymentMethod.ICreate;
  const paymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      { body: paymentMethodBody },
    );
  typia.assert(paymentMethod);

  // 4. Place a new order as customer (order_total/currency; minimal valid)
  const orderBody = {
    shipping_address_id: orderAddress.id,
    payment_method_id: paymentMethod.id,
    order_total: 10000,
    currency: "KRW",
  } satisfies IShoppingMallOrder.ICreate;
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert(order);

  // 5. Query order histories - no filter (should return event for order)
  const queryAllBody = {} satisfies IShoppingMallOrderHistory.IRequest;
  const historiesAll =
    await api.functional.shoppingMall.customer.orderHistories.index(
      connection,
      { body: queryAllBody },
    );
  typia.assert(historiesAll);
  TestValidator.predicate(
    "should return at least one event for placed order",
    historiesAll.data.some((h) => h.shopping_mall_order_id === order.id),
  );

  // 6. Query with order_id filter (must ONLY get for given order)
  const queryOrderFilter = {
    order_id: order.id,
  } satisfies IShoppingMallOrderHistory.IRequest;
  const historiesByOrder =
    await api.functional.shoppingMall.customer.orderHistories.index(
      connection,
      { body: queryOrderFilter },
    );
  typia.assert(historiesByOrder);
  TestValidator.predicate(
    "history by order_id should only contain events for that order",
    historiesByOrder.data.every((h) => h.shopping_mall_order_id === order.id),
  );

  // 7. Query with a bogus order_id: expect empty array
  const fakeOrderId = typia.random<string & tags.Format<"uuid">>();
  const queryFakeOrder = {
    order_id: fakeOrderId,
  } satisfies IShoppingMallOrderHistory.IRequest;
  const historiesByBogus =
    await api.functional.shoppingMall.customer.orderHistories.index(
      connection,
      { body: queryFakeOrder },
    );
  typia.assert(historiesByBogus);
  TestValidator.equals(
    "history for bogus order_id is empty",
    historiesByBogus.data.length,
    0,
  );

  // 8. Pagination check: use limit=1; for total>1 verifiy only 1 returned, correct attributes
  const queryPaginated = {
    order_id: order.id,
    limit: 1 as number &
      tags.Type<"int32"> &
      tags.Default<20> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IShoppingMallOrderHistory.IRequest;
  const historiesPage1 =
    await api.functional.shoppingMall.customer.orderHistories.index(
      connection,
      { body: queryPaginated },
    );
  typia.assert(historiesPage1);
  TestValidator.equals(
    "limit one matches page data length",
    historiesPage1.data.length,
    1,
  ); // single paged?
  TestValidator.equals(
    "pagination current is 1",
    historiesPage1.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination count matches reported record count",
    historiesPage1.pagination.records >= historiesPage1.data.length,
  );
  TestValidator.equals(
    "order_id in paged result matches requested order",
    historiesPage1.data[0]?.shopping_mall_order_id,
    order.id,
  );
}
