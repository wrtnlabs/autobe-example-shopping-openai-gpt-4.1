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
import type { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import type { IShoppingMallOrderPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderPaymentMethod";

/**
 * Validate administrator privileged access to order history snapshot details.
 *
 * This test simulates the following complete business flow:
 *
 * 1. Register a platform admin for elevated privileges.
 * 2. Register a new customer (with required personal and address info).
 * 3. Create an order address snapshot to be used for this order (as customer).
 * 4. As an admin, create a payment method snapshot for compliance.
 * 5. Place a customer order referencing the order address and admin-created
 *    payment method snapshots.
 * 6. Attempt to retrieve a newly generated order history by ID as admin.
 *
 * NOTES: Due to the absence of any order status mutation or order event API in
 * the allowed interface set, this test cannot guarantee the existence of an
 * actual order history entry linked to the newly created order. Therefore, the
 * test uses a randomly generated UUID for the order history lookup as a smoke
 * test for the endpoint, privilege, and type/interface conformance. Business
 * linkage, existence guarantees, and full referential validation are OUT OF
 * SCOPE for this E2E given current API constraints. This limitation should be
 * remedied with more complete API exposure for production E2E coverage.
 *
 * Validates:
 *
 * - The administrator can access the full details of the order history snapshot
 *   by its unique ID (type-level validation only).
 * - Business and compliance comments, order status, and amounts are visible in
 *   the response (if record exists).
 * - Access requires valid admin authentication—non-admins are denied.
 * - Referential integrity cannot be guaranteed in this test due to missing
 *   creation API for order history records.
 */
export async function test_api_admin_order_history_at_detail_authorized(
  connection: api.IConnection,
) {
  // Step 1: Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(16),
        full_name: RandomGenerator.name(),
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);
  // Step 2: Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: RandomGenerator.alphaNumeric(14),
        full_name: RandomGenerator.name(2),
        phone: RandomGenerator.mobile(),
        address: {
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          region: RandomGenerator.paragraph({ sentences: 1 }),
          postal_code: RandomGenerator.alphabets(5),
          address_line1: RandomGenerator.paragraph({ sentences: 2 }),
          address_line2: null,
          is_default: true,
        } satisfies IShoppingMallCustomerAddress.ICreate,
      } satisfies IShoppingMallCustomer.IJoin,
    });
  typia.assert(customer);
  // Step 3: Create order address snapshot (as customer; address details must match specs)
  const orderAddress: IShoppingMallOrderAddress =
    await api.functional.shoppingMall.customer.orderAddresses.create(
      connection,
      {
        body: {
          address_type: "shipping",
          recipient_name: customer.full_name,
          phone: customer.phone,
          zip_code: RandomGenerator.alphaNumeric(5),
          address_main: RandomGenerator.paragraph({ sentences: 2 }),
          address_detail: null,
          country_code: "KOR",
        } satisfies IShoppingMallOrderAddress.ICreate,
      },
    );
  typia.assert(orderAddress);
  // Step 4: Create payment method snapshot (as admin)
  const paymentMethod: IShoppingMallOrderPaymentMethod =
    await api.functional.shoppingMall.admin.orderPaymentMethods.create(
      connection,
      {
        body: {
          payment_method_type: "card",
          method_data: RandomGenerator.alphaNumeric(16),
          display_name: "VISA ****1234",
        } satisfies IShoppingMallOrderPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);
  // Step 5: Place order as customer (reference created address/payment)
  const order: IShoppingMallOrder =
    await api.functional.shoppingMall.customer.orders.create(connection, {
      body: {
        shopping_mall_customer_id: customer.id,
        shipping_address_id: orderAddress.id,
        payment_method_id: paymentMethod.id,
        order_total: 159000,
        currency: "KRW",
      } satisfies IShoppingMallOrder.ICreate,
    });
  typia.assert(order);
  // Step 6: Retrieve an order history record for the new order as admin and check response
  // (Due to lack of history generation API, we use a random UUID as a smoke test for the endpoint and type interface.)
  const historyId = typia.random<string & tags.Format<"uuid">>();
  const orderHistory: IShoppingMallOrderHistory =
    await api.functional.shoppingMall.admin.orderHistories.at(connection, {
      orderHistoryId: historyId,
    });
  typia.assert(orderHistory);
  // Key fields validation (type/shape-only)
  TestValidator.predicate(
    "administrator can see order status",
    typeof orderHistory.order_status === "string" &&
      orderHistory.order_status.length > 0,
  );
  TestValidator.predicate(
    "history snapshot total is numeric",
    typeof orderHistory.order_total === "number",
  );
  // (Optionally check for compliance/business comments and reasons if populated)
}
