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
import type { IShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPayment";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate that a seller can retrieve payment details for one of their orders
 * (success case), and that an unrelated seller cannot access payment details
 * for another seller's order (forbidden).
 *
 * Steps:
 *
 * 1. Register seller (main seller, and another unrelated seller for negative test)
 * 2. Register product category
 * 3. Register product (by main seller)
 * 4. Register customer account
 * 5. Customer snapshot order address
 * 6. Admin creates order payment method snapshot
 * 7. Customer creates order (referencing product, category, address, payment
 *    method)
 * 8. Customer initiates order payment (gets paymentId)
 * 9. Switch to seller account, retrieve payment detail (expect success)
 * 10. Switch to unrelated seller account, attempt retrieve payment detail (expect
 *     error)
 */
export async function test_api_order_payment_detail_retrieval_by_seller(
  connection: api.IConnection,
) {
  // 1. Register main seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "Aa!1234567",
      business_name: RandomGenerator.name(),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerJoin);
  const sellerId = sellerJoin.id;

  // 1b. Register unrelated seller for negative scenario
  const otherSellerEmail = typia.random<string & tags.Format<"email">>();
  const otherSellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: otherSellerEmail,
      password: "Aa!1234567",
      business_name: RandomGenerator.name(),
      contact_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      business_registration_number: RandomGenerator.alphaNumeric(10),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(otherSellerJoin);

  // 2. Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name_ko: RandomGenerator.paragraph({ sentences: 1 }),
        name_en: RandomGenerator.paragraph({ sentences: 1 }),
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);
  const categoryId = category.id;

  // 3. Seller creates a product
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: sellerId,
        shopping_mall_category_id: categoryId,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_active: true,
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. Customer joins
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerJoin = await api.functional.auth.customer.join(connection, {
    body: {
      email: customerEmail,
      password: "Aa!1234567",
      full_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      address: {
        recipient_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        region: RandomGenerator.paragraph({ sentences: 1 }),
        postal_code: RandomGenerator.alphaNumeric(6),
        address_line1: RandomGenerator.paragraph({ sentences: 1 }),
        is_default: true,
      } satisfies IShoppingMallCustomerAddress.ICreate,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerJoin);

  // 5. Customer creates order address snapshot
  const orderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: customerJoin.full_name,
          phone: customerJoin.phone,
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 1 }),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 6. Admin creates order payment method snapshot
  const orderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(8),
          display_name: RandomGenerator.name(),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(orderPaymentMethod);

  // 7. Customer creates order
  const order = await api.functional.shoppingMall.customer.orders.create(
    connection,
    {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: orderPaymentMethod.id,
        order_total: 19900,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    },
  );
  typia.assert(order);

  // 8. Customer initiates payment for the order
  const payment =
    await api.functional.shoppingMall.customer.orders.payments.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_payment_method_id: order.payment_method_id,
          payment_ref: RandomGenerator.alphaNumeric(10),
          payment_type: orderPaymentMethod.payment_method_type,
          status: "authorized",
          paid_amount: order.order_total,
          currency: order.currency,
        } satisfies IShoppingMallOrderPayment.ICreate,
      },
    );
  typia.assert(payment);

  // 9. Switch to seller account and retrieve payment details
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: "Aa!1234567",
      business_name: sellerJoin.business_name,
      contact_name: sellerJoin.contact_name,
      phone: sellerJoin.phone,
      business_registration_number: sellerJoin.business_registration_number,
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Try to retrieve payment details
  const sellerPayment =
    await api.functional.shoppingMall.seller.orders.payments.at(connection, {
      orderId: order.id,
      paymentId: payment.id,
    });
  typia.assert(sellerPayment);
  TestValidator.equals(
    "seller can retrieve their own order payment details",
    sellerPayment,
    payment,
  );

  // 10. Switch to unrelated seller and expect forbidden error
  await api.functional.auth.seller.join(connection, {
    body: {
      email: otherSellerEmail,
      password: "Aa!1234567",
      business_name: otherSellerJoin.business_name,
      contact_name: otherSellerJoin.contact_name,
      phone: otherSellerJoin.phone,
      business_registration_number:
        otherSellerJoin.business_registration_number,
    } satisfies IShoppingMallSeller.IJoin,
  });
  await TestValidator.error(
    "unrelated seller cannot access payment detail for other's order",
    async () => {
      await api.functional.shoppingMall.seller.orders.payments.at(connection, {
        orderId: order.id,
        paymentId: payment.id,
      });
    },
  );
}
