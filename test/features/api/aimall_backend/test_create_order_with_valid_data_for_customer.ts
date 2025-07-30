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
 * End-to-end test for creating a new customer order with valid data.
 *
 * This test ensures that an authenticated customer can create a new order when
 * all referenced entities (customer, seller, address, product) exist and all
 * required business fields are supplied, according to
 * IAimallBackendOrder.ICreate schema. The goal is to verify correct order
 * creation, auto-generation of order_number if not provided, proper linkage of
 * customer/seller/address references, and that returned order record matches
 * the input data for relevant fields.
 *
 * The workflow involves:
 *
 * 1. Register a new customer using aimall_backend.customers.create
 * 2. Create a new seller using aimall_backend.administrator.sellers.create
 * 3. Fetch a product from aimall_backend.products.index (simulate customer
 *    shopping)
 * 4. Add a delivery address for the new customer
 *    (aimall_backend.customer.customers.addresses.create)
 * 5. Submit a new order as the customer, using valid references above and
 *    realistic required fields (omit order_number to test system
 *    auto-numbering)
 * 6. Validate that the returned response includes the same data for customer_id,
 *    seller_id, address_id, order_status, total_amount, currency and a valid
 *    order_number
 * 7. Assert field types and business logic, ensuring properly linked references.
 *
 * This test confirms system compliance for happy-path order creation and
 * correct default value handling.
 */
export async function test_api_aimall_backend_test_create_order_with_valid_data_for_customer(
  connection: api.IConnection,
) {
  // 1. Register a new customer (order owner)
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPhone: string = RandomGenerator.mobile();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerEmail,
        phone: customerPhone,
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. Register a seller
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: sellerEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 3. Fetch a product (dependency - for business context, not order payload)
  const productsPage =
    await api.functional.aimall_backend.products.index(connection);
  typia.assert(productsPage);
  TestValidator.predicate("Products available")(productsPage.data.length > 0);
  const product = RandomGenerator.pick(productsPage.data);

  // 4. Add a delivery address for the customer
  const address =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Home",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          address_line1: RandomGenerator.paragraph()(),
          city: "Seoul",
          postal_code: (10000 + Math.floor(Math.random() * 90000)).toString(),
          country: "Korea",
          is_default: true,
        },
      },
    );
  typia.assert(address);

  // 5. Submit a new order as the customer, omitting order_number (system generates)
  const createOrderBody = {
    customer_id: customer.id,
    seller_id: seller.id,
    address_id: address.id,
    order_status: "pending",
    total_amount: 10000, // Simulated order amount
    currency: "KRW",
    // order_number omitted
  } satisfies IAimallBackendOrder.ICreate;
  const createdOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: createOrderBody,
    });
  typia.assert(createdOrder);

  // 6. Validate response matches input and business logic
  TestValidator.equals("customer_id")(createdOrder.customer_id)(customer.id);
  TestValidator.equals("seller_id")(createdOrder.seller_id)(seller.id);
  TestValidator.equals("address_id")(createdOrder.address_id)(address.id);
  TestValidator.equals("order_status")(createdOrder.order_status)("pending");
  TestValidator.equals("total_amount")(createdOrder.total_amount)(10000);
  TestValidator.equals("currency")(createdOrder.currency)("KRW");
  TestValidator.predicate("order_number generated")(
    typeof createdOrder.order_number === "string" &&
      createdOrder.order_number.length > 0,
  );
}
