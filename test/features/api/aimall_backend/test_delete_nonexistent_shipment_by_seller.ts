import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Test deleting a (nonexistent) shipment record from an order as the seller.
 *
 * This test validates that attempting to delete a shipment using an invalid or
 * random shipmentId for a real, owned order correctly returns a not found error
 * (or is a no-op with no error if idempotent). The owner seller context is
 * confirmed.
 *
 * Steps:
 *
 * 1. Create a test customer.
 * 2. Create a test seller.
 * 3. Create a product for that seller (random category).
 * 4. Create a delivery address for the customer.
 * 5. Create an order for that seller/customer combination.
 * 6. Attempt to DELETE a shipment using a random (guaranteed nonexistent)
 *    shipmentId for that order as the seller.
 * 7. Assert that an error is thrown (or the API is a no-op) and no data is
 *    affected for valid order.
 */
export async function test_api_aimall_backend_test_delete_nonexistent_shipment_by_seller(
  connection: api.IConnection,
) {
  // 1. Create a customer account
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. Create a seller account
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: "Test Seller " + typia.random<string>(),
          email: typia.random<string>(),
          contact_phone: typia.random<string>(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 3. Register a product linked to the seller (random category)
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: "Test Product " + typia.random<string>(),
          description: "Test product description",
          main_thumbnail_uri: undefined,
          status: "active",
        },
      },
    );
  typia.assert(product);

  // 4. Create a shipping address for the customer
  const address =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Test Address",
          recipient_name: "John Doe",
          phone: customer.phone,
          address_line1: "123 Test Rd",
          address_line2: undefined,
          city: "Seoul",
          postal_code: "12345",
          country: "KOR",
          is_default: true,
        },
      },
    );
  typia.assert(address);

  // 5. Create a valid order
  const order = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: address.id,
        order_status: "pending",
        total_amount: 19900,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 6. Attempt to delete a shipment (with a random, guaranteed nonexistent ID)
  await TestValidator.error("Deleting nonexistent shipment returns error")(
    async () => {
      await api.functional.aimall_backend.seller.orders.shipments.erase(
        connection,
        {
          orderId: order.id,
          shipmentId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
