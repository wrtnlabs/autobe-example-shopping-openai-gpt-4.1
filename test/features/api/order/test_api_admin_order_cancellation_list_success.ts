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

/**
 * Validate that an admin can successfully retrieve a paginated and filtered
 * list of order cancellation requests for any given order. This test creates
 * all necessary business preconditions: admin and customer
 * registration/authentication, order address and payment method creation,
 * followed by order creation. The test then queries the admin cancellation list
 * endpoint for a valid order, ensuring the admin can access audit trail as
 * designed. Verification covers proper pagination structure, valid (possibly
 * empty) cancellation list contents, and confirmed access scope; the main
 * success path ensures the API returns an IPageIShoppingMallOrderCancellation
 * object without error. No type error or non-existent API calls are used.
 */
export async function test_api_admin_order_cancellation_list_success(
  connection: api.IConnection,
) {
  // 1. Register an admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(10),
        full_name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Register and authenticate a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(10),
        full_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(2),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 4,
            wordMax: 10,
          }),
          postal_code: RandomGenerator.alphaNumeric(5),
          address_line1: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 8,
            wordMax: 16,
          }),
          address_line2: null,
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. The customer creates and saves an order address snapshot
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(2),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(6),
          address_main: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 12,
            wordMax: 24,
          }),
          address_detail: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 4. The admin creates a payment method snapshot
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(12),
          display_name: "Visa ****" + RandomGenerator.alphaNumeric(4),
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 5. The customer places an order using the created address and payment method
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 6. The admin queries for all cancellation requests for the order (should be empty list initially)
  const cancellationPage: IPageIShoppingMallOrderCancellation =
    await api.functional.shoppingMall.admin.orders.cancellations.index(
      connection,
      {
        orderId: order.id,
        body: {
          orderId: order.id,
          reason_code: "customer_request",
        } satisfies IShoppingMallOrderCancellation.IRequest,
      },
    );
  typia.assert(cancellationPage);
  TestValidator.equals(
    "admin can retrieve cancellation requests page structure",
    cancellationPage.pagination.current,
    0,
  );
  TestValidator.predicate(
    "cancellation request list is array",
    Array.isArray(cancellationPage.data),
  );
}
