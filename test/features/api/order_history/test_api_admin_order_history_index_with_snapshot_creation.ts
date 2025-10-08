import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderHistory";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import type { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Validate that after a customer places an order, including creating shipping
 * address and payment method snapshots, an admin can retrieve order history
 * snapshots with query and pagination, and the result includes at least one
 * snapshot for the new order.
 *
 * Steps:
 *
 * 1. Register an admin and a customer
 * 2. Customer creates a historical shipping address snapshot
 * 3. Admin creates a payment method snapshot
 * 4. Customer places an order using the above address/payment snapshot
 * 5. Admin queries paginated order history and ensures the new order (by order ID)
 *    appears as at least one snapshot entry
 */
export async function test_api_admin_order_history_index_with_snapshot_creation(
  connection: api.IConnection,
) {
  // Step 1: Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(10),
        full_name: RandomGenerator.name(),
        status: "active", // for maximum access
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Register customer and create initial address for customer account
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(10),
        full_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(1),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.paragraph({ sentences: 1 }),
          postal_code: RandomGenerator.alphaNumeric(5),
          address_line1: RandomGenerator.paragraph({ sentences: 2 }),
          address_line2: null,
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);

  // Step 3: Customer creates order address snapshot
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: RandomGenerator.name(1),
          phone: RandomGenerator.mobile(),
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: null,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);

  // Step 4: Admin creates payment method snapshot
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(8),
          display_name: "Visa ****1234",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);

  // Step 5: Customer places an order using address/payment snapshot
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        // customer ID omitted - added by session
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 10000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);

  // Step 6: Admin queries paginated order histories for this order
  const historyPage: IPageIShoppingMallOrderHistory.ISummary =
    await api.functional.shoppingMall.admin.orderHistories.index(connection, {
      body: {
        order_id: order.id,
        page: 1 satisfies number as number,
        limit: 20 satisfies number as number,
      } satisfies IShoppingMallOrderHistory.IRequest,
    });
  typia.assert(historyPage);
  TestValidator.predicate(
    "returned order history includes at least one snapshot for placed order",
    historyPage.data.some((snap) => snap.shopping_mall_order_id === order.id),
  );
}
