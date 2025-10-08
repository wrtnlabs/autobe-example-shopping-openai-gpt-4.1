import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";
import type { IShoppingMallOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderRefund";

/**
 * Validate forbidden and not-found cases for admin retrieving order refund
 * details.
 *
 * This test validates that an admin cannot access order refund details in a
 * forbidden way or when the refundId/orderId is invalid or mismatched.
 *
 * Steps:
 *
 * 1. Admin registers and logs in.
 * 2. Customer registers (to generate an account context for an order).
 * 3. Customer creates shipping address.
 * 4. Admin creates payment method snapshot for the order.
 * 5. Customer creates an order via the API using the order address and payment
 *    method.
 * 6. Admin attempts to access order refund details with: a) a random non-existent
 *    refundId b) a refundId that doesn't match the created orderId c) a random
 *    orderId and refundId combination
 *
 * For each case, assert that an error is raised (forbidden or not-found) and no
 * refund entity is returned.
 */
export async function test_api_order_refund_detail_admin_forbidden(
  connection: api.IConnection,
) {
  // 1. Admin registers
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        full_name: RandomGenerator.name(),
        // status is optional
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Customer registers
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(12) as string &
          tags.MinLength<8> &
          tags.MaxLength<100>,
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.paragraph({ sentences: 1 }),
          postal_code: RandomGenerator.alphaNumeric(5),
          address_line1: RandomGenerator.paragraph({ sentences: 1 }),
          address_line2: null,
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // 3. Customer creates shipping address
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 1 }),
          address_detail: null,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // 4. Admin creates payment method
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(12),
          display_name: `VISA ****${RandomGenerator.alphaNumeric(4)}`,
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // 5. Customer creates order
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 1000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // 6a. Admin tries to access refund with random (but valid) refundId for this orderId (not associated, likely not exist)
  await TestValidator.error(
    "admin cannot get refund detail with non-existent refundId",
    async () => {
      await api.functional.shoppingMall.admin.orders.refunds.at(connection, {
        orderId: order.id,
        refundId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 6b. Admin tries to access refund with random refundId and random (not this order's) orderId
  await TestValidator.error(
    "admin cannot get refund detail with wrong orderId/refundId combo",
    async () => {
      await api.functional.shoppingMall.admin.orders.refunds.at(connection, {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        refundId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
