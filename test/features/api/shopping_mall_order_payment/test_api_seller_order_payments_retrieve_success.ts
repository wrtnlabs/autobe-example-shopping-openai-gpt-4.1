import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderPayment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
 * Test the workflow where a seller retrieves payment records for one of their
 * own orders.
 *
 * 1. Register an admin for category/product setup
 * 2. Register a seller for ownership
 * 3. Admin creates a product category
 * 4. Admin creates a product attributed to the seller and category
 * 5. Register a customer
 * 6. Customer creates an order address snapshot
 * 7. Admin creates a payment method snapshot (for this test)
 * 8. Customer creates an order, referencing the created address/payment
 *    method/product
 * 9. As the seller, retrieves payment records for the order and validates the
 *    records are relevant and correct
 */
export async function test_api_seller_order_payments_retrieve_success(
  connection: api.IConnection,
) {
  // 1. Register admin (for category/product/payment method setup)
  const adminEmail = `${RandomGenerator.alphaNumeric(8)}@admin.com`;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register seller
  const sellerEmail = `${RandomGenerator.alphaNumeric(8)}@seller.com`;
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerReg: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        business_name: RandomGenerator.paragraph({ sentences: 2 }),
        contact_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_registration_number: RandomGenerator.alphaNumeric(10),
        kyc_document_uri: null,
      } satisfies IShoppingMallSeller.IJoin,
    });
  typia.assert(sellerReg);

  // 3. Admin creates category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        parent_id: undefined,
        name_ko: RandomGenerator.name(),
        name_en: RandomGenerator.name(),
        description_ko: null,
        description_en: null,
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // 4. Admin creates product attributed to seller in created category
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: sellerReg.id,
        shopping_mall_category_id: category.id,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        is_active: true,
        main_image_url: null,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // 5. Register customer
  const customerEmail = `${RandomGenerator.alphaNumeric(8)}@customer.com`;
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.paragraph({ sentences: 2 }),
          postal_code: RandomGenerator.alphaNumeric(5),
          address_line1: RandomGenerator.paragraph({ sentences: 2 }),
          address_line2: null,
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 6. Customer creates order address snapshot
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: null,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 7. Admin creates payment method snapshot
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: "masked: 1234-****-****-5678",
          display_name: "VISA ****5678",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 8. Customer creates order
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 100000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 9. Seller retrieves payment records for the order
  const paymentsPage: IPageIShoppingMallOrderPayment =
    await api.functional.shoppingMall.seller.orders.payments.index(connection, {
      orderId: order.id,
      body: {
        orderId: order.id,
      } satisfies IShoppingMallOrderPayment.IRequest,
    });
  typia.assert(paymentsPage);

  // Validate that payment records only relate to the given order
  for (const payment of paymentsPage.data) {
    TestValidator.equals(
      "payment order linkage",
      payment.shopping_mall_order_id,
      order.id,
    );
  }
}
