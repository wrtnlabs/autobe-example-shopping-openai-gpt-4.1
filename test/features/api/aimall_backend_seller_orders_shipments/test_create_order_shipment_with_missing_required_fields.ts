import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendAddress";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendShipment";

/**
 * E2E test: Attempt to create an order shipment with missing required fields
 * (validation error).
 *
 * This test verifies that the API prevents shipment creation when required
 * fields (e.g., 'carrier') are omitted from the request. Prerequisites:
 *
 * 1. Create a customer
 * 2. Create a seller
 * 3. Create a product
 * 4. Create an address for the customer
 * 5. Create an order that ties all entities together
 *
 * Negative test: 6. Attempt to create a shipment for the order omitting the
 * required 'carrier' field. However, since 'carrier' is required in the
 * IAimallBackendShipment.ICreate DTO and the TypeScript type system enforces
 * its inclusion, it is not possible to skip this field at the type level
 * without bypassing type safety (which is prohibited by policy).
 *
 * Therefore, this negative test for missing required shipment fields cannot be
 * implemented within strict type-safe E2E testing. Instead, restrict E2E
 * negative shipment field coverage only to business logic errors that do not
 * require type safety violation.
 */
export async function test_api_aimall_backend_seller_orders_shipments_test_create_order_shipment_with_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. Create a customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create a seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: "Test Seller LLC",
          email: typia.random<string>(),
          contact_phone: typia.random<string>(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 3. Create a product
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string>(),
          seller_id: seller.id,
          title: "Test Product",
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 4. Create an address for the customer
  const address =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Home",
          recipient_name: "John Doe",
          phone: typia.random<string>(),
          address_line1: "123 Test St",
          city: "Seoul",
          postal_code: "12345",
          country: "South Korea",
          is_default: true,
        } satisfies IAimallBackendAddress.ICreate,
      },
    );
  typia.assert(address);

  // 5. Create an order
  const order = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: address.id,
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);

  // 6. Cannot perform a negative test for missing 'carrier' or other required fields, as the DTO type prohibits omitting them.
  //    Such a test would violate type safety policies of this E2E framework.
  //    No negative test for missing required fields is implemented here.
}
