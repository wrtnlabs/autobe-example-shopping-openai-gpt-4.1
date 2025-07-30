import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IPageIAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendProduct";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validates enforcement of unique order_number constraint on order creation in
 * the AIMall Backend Order API.
 *
 * Business context: When placing a new order, the system should enforce a
 * unique (per-table) order_number. If an explicit order_number is specified,
 * creating a second order with the same order_number (even if other details
 * differ or are for another user) must fail.
 *
 * Test process:
 *
 * 1. Create a customer for ordering.
 * 2. Create a seller (fulfiller) for the order; required for order link.
 * 3. Create an address for the customer.
 * 4. Retrieve available products; select one for the order.
 * 5. Create the first order explicitly providing a fixed order_number.
 * 6. Try to create a second order (again explicit order_number, with otherwise
 *    valid data, can be same customer or different customer), expecting it to
 *    fail with a uniqueness violation.
 * 7. Assert the first succeeds and the second fails as per the business
 *    constraint.
 *
 * The API must reject the second call with a unique/duplicate order_number
 * error, confirming business logic is correctly enforced.
 */
export async function test_api_customer_orders_test_create_order_duplicate_order_number(
  connection: api.IConnection,
) {
  // 1. Create test customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: RandomGenerator.alphabets(10) + "@test.com",
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. Create test seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(12),
          email: RandomGenerator.alphabets(8) + "@seller.com",
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 3. Create address for the customer
  const address =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Home",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          address_line1: RandomGenerator.alphabets(10) + " St.",
          city: "Seoul",
          country: "Republic of Korea",
          is_default: true,
          postal_code: "06236",
        },
      },
    );
  typia.assert(address);

  // 4. Select a valid product
  const productsResponse =
    await api.functional.aimall_backend.products.index(connection);
  typia.assert(productsResponse);
  const product = productsResponse.data.find((p) => p.status === "active");
  if (!product) throw new Error("No active products found for test");

  // 5. Create the first order with an explicit order_number
  const orderNumber = "ORD-TEST-20250729-001";
  const firstOrder = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: address.id,
        order_number: orderNumber,
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      },
    },
  );
  typia.assert(firstOrder);
  TestValidator.equals("First order created with explicit order_number")(
    firstOrder.order_number,
  )(orderNumber);

  // 6. Attempt to create a second order with the same explicit order_number; should fail
  await TestValidator.error(
    "Creating another order with duplicate order_number should fail",
  )(async () => {
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: address.id,
        order_number: orderNumber, // Reuse same order_number to trigger constraint
        order_status: "pending",
        total_amount: 20000,
        currency: "KRW",
      },
    });
  });
}
