import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validate admin-based order creation against real business flows.
 *
 * This test ensures that an administrator can successfully create a new order
 * by following the required steps of registering a customer, onboarding a
 * seller, and adding a shipping address for that customer. After preparing all
 * required entities, it issues an order creation request with properly mapped
 * customer_id, seller_id, address_id, and other business-required properties
 * such as order_number, order_status, total_amount, and currency.
 *
 * The test verifies:
 *
 * - All dependency records (customer, seller, address) are created and have valid
 *   fields.
 * - The order is successfully created and links the expected customer, seller,
 *   and address via their IDs.
 * - All required business fields (order_number, order_status, total_amount,
 *   currency) are present and valid.
 * - The returned order object contains valid created_at/updated_at timestamps
 *   and, if present, a null or ISO date archived_at.
 * - Business rules are enforced (e.g., total_amount ≥ 0).
 * - Optionally, the existence of audit log records may be inferred if such API or
 *   direct DB check is possible.
 *
 * Steps:
 *
 * 1. Create a customer with unique email/phone and active status
 * 2. Create a seller with valid required business properties
 * 3. Add a delivery address for the customer
 * 4. Perform order creation with references to above IDs
 * 5. Validate that the received order includes all the mapped and system-generated
 *    fields (and business logic checks)
 */
export async function test_api_aimall_backend_administrator_orders_test_admin_create_order_with_valid_customer_seller_and_address(
  connection: api.IConnection,
) {
  // 1. Register customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        password_hash: RandomGenerator.alphaNumeric(60),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Onboard a seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.paragraph()(1),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 3. Add address for the customer
  const address =
    await api.functional.aimall_backend.administrator.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Home",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          address_line1: RandomGenerator.paragraph()(),
          city: "Seoul",
          postal_code: "06000",
          country: "South Korea",
          is_default: true,
        } satisfies IAimallBackendAddress.ICreate,
      },
    );
  typia.assert(address);

  // 4. Compose order creation payload
  const order_number = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${((Math.random() * 10000) | 0).toString().padStart(4, "0")}`;
  const total_amount = 54000;
  const payload = {
    customer_id: customer.id,
    seller_id: seller.id,
    address_id: address.id,
    order_number,
    order_status: "pending",
    total_amount,
    currency: "KRW",
  } satisfies IAimallBackendOrder.ICreate;

  // 5. Perform order creation and assert response
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: payload,
    },
  );
  typia.assert(order);
  TestValidator.equals("customer mapping")(order.customer_id)(customer.id);
  TestValidator.equals("seller mapping")(order.seller_id)(seller.id);
  TestValidator.equals("address mapping")(order.address_id)(address.id);
  TestValidator.equals("order number")(order.order_number)(order_number);
  TestValidator.equals("amount")(order.total_amount)(total_amount);
  TestValidator.equals("currency")(order.currency)("KRW");
  TestValidator.equals("order_status")(order.order_status)("pending");
  TestValidator.predicate("created_at is ISO date format")(
    /\d{4}-\d{2}-\d{2}T\d{2}:.+/.test(order.created_at),
  );
  TestValidator.predicate("updated_at is ISO date format")(
    /\d{4}-\d{2}-\d{2}T\d{2}:.+/.test(order.updated_at),
  );
  // Properly assert that archived_at is either null or a string
  TestValidator.predicate("archived_at is null or string")(
    order.archived_at === null || typeof order.archived_at === "string",
  );
}
