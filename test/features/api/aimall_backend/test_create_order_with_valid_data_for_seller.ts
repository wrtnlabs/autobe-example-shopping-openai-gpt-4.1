import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Test seller-side order creation with complete, valid business data.
 *
 * This test verifies the end-to-end order creation process for a seller,
 * ensuring:
 *
 * - All required references (customer, seller, delivery address) are properly
 *   established and used
 * - All business-critical fields (total_amount, currency, status, order_number)
 *   are provided and validated
 * - Duplicate order numbers are avoided and format is as expected
 * - Returned order is normalized and includes audit timestamps
 * - Seller can retrieve the created order and fields persist as expected
 *
 * Workflow:
 *
 * 1. Create a customer record (for customer_id)
 * 2. Register a seller (for seller_id)
 * 3. Register a delivery address under that customer
 * 4. Compose a unique order number (test uniqueness and format assumptions)
 * 5. Create an order as that seller, with all required associations and valid
 *    business fields
 * 6. Validate the creation response matches schema and required references
 * 7. (Not implemented, as "retrieve order by seller after creation" API is not
 *    available in given functions)
 */
export async function test_api_aimall_backend_test_create_order_with_valid_data_for_seller(
  connection: api.IConnection,
) {
  // 1. Create a customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. Register a seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphaNumeric(8),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 3. Register a delivery address for the customer
  const address =
    await api.functional.aimall_backend.administrator.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Home",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          address_line1: RandomGenerator.alphaNumeric(12),
          // address_line2 is optional
          city: "Seoul",
          postal_code: "06234",
          country: "South Korea",
          is_default: true,
        },
      },
    );
  typia.assert(address);

  // 4. Compose a unique order number for this test
  const orderNumber = `ORD-${new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .slice(
      0,
      12,
    )}-${typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<9999>>()}`;

  // 5. Create the order as the seller
  const order = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: address.id,
        order_number: orderNumber,
        order_status: "pending",
        total_amount: 19900,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 6. Validate fields are returned and referenced IDs are correct
  TestValidator.equals("customer_id")(order.customer_id)(customer.id);
  TestValidator.equals("seller_id")(order.seller_id)(seller.id);
  TestValidator.equals("address_id")(order.address_id)(address.id);
  TestValidator.equals("order_number")(order.order_number)(orderNumber);
  TestValidator.equals("currency")(order.currency)("KRW");
  TestValidator.predicate("created_at is ISO8601")(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(order.created_at),
  );
  TestValidator.predicate("updated_at is ISO8601")(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(order.updated_at),
  );
}
