import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * E2E: Seller order detail access and validation
 *
 * - Register seller (main test subject)
 * - Create category (admin-only)
 * - Seller creates product in that category
 * - Register customer, generate order address
 * - Create payment method (admin-only)
 * - Customer places order with that product,
 * - Seller (authenticated) fetches details by orderId
 * - Check order structure and correct access
 * - Validate seller cannot access unrelated order
 * - Validate other seller cannot access this order
 */
export async function test_api_order_detail_view_by_seller(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerBusinessNum = RandomGenerator.alphaNumeric(12);
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: RandomGenerator.alphaNumeric(12),
        business_name: RandomGenerator.name(2),
        contact_name: RandomGenerator.name(1),
        phone: RandomGenerator.mobile(),
        business_registration_number: sellerBusinessNum,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(seller);

  // 2. Admin creates a category (simulate admin by context)
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: RandomGenerator.name(2),
        name_en: RandomGenerator.name(2),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 3. Seller creates a product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        shopping_mall_seller_id: seller.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 8 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 4. Register customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(14),
        full_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(1),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.name(1),
          postal_code: "12345",
          address_line1: RandomGenerator.name(2),
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 5. Customer creates shipping address snapshot for order
  const orderAddr: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(2),
          phone: RandomGenerator.mobile(),
          zip_code: "12345",
          address_main: RandomGenerator.name(3),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddr);

  // 6. Admin creates order payment method snapshot
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: '{"card":"Visa ****1111"}',
          display_name: "Visa **** 1111",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 7. Customer places an order containing seller's product
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: orderAddr.id,
        payment_method_id: paymentMethod.id,
        order_total: 19900,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 8. Seller retrieves their order details
  const sellerConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: seller.token.access },
  };
  const fetchedOrder: IShoppingMallOrder =
    await api.functional.shoppingMall.seller.orders.at(sellerConnection, {
      orderId: order.id,
    });
  typia.assert(fetchedOrder);
  TestValidator.equals("seller's order id matches", fetchedOrder.id, order.id);
  TestValidator.equals(
    "seller's customer id matches",
    fetchedOrder.shopping_mall_customer_id,
    customer.id,
  );
  TestValidator.equals(
    "seller field matches",
    fetchedOrder.shopping_mall_seller_id,
    seller.id,
  );
  TestValidator.equals("order total", fetchedOrder.order_total, 19900);

  // 9. Seller tries to fetch non-existent unrelated order (should fail)
  await TestValidator.error(
    "should not retrieve non-existent order",
    async () => {
      await api.functional.shoppingMall.seller.orders.at(sellerConnection, {
        orderId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 10. Register secondary seller, try to access order, should fail
  const sellerB: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(13),
        business_name: RandomGenerator.name(2),
        contact_name: RandomGenerator.name(1),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(12),
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(sellerB);
  const sellerBConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: sellerB.token.access },
  };
  await TestValidator.error(
    "other seller cannot access this order",
    async () => {
      await api.functional.shoppingMall.seller.orders.at(sellerBConnection, {
        orderId: order.id,
      });
    },
  );
}
