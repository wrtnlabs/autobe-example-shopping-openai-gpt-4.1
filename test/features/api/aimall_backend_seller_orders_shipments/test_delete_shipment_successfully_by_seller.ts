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
 * E2E test for verifying that a seller can delete a shipment for their own
 * order.
 *
 * This function verifies the complete workflow to ensure a shipment—created by
 * a seller for an order they own—can be successfully deleted, and that entity
 * relationships are managed coherently throughout the process.
 *
 * Steps:
 *
 * 1. Create a customer (order recipient)
 * 2. Create a seller (who will own the shipment and order)
 * 3. Create a product for that seller (a product is required to make the scenario
 *    business-real)
 * 4. Register a delivery address for the customer
 * 5. Create an order associating the customer, seller, and address
 * 6. Create a shipment for that order
 * 7. Delete the shipment using the API function
 * 8. (Not implemented: Shipment existence check post-deletion, as the API does not
 *    provide a shipment GET/read function.)
 *
 * Assertions:
 *
 * - All creation steps succeed and return correct object types
 * - Deletion of shipment succeeds and raises no error
 *
 * Note: If shipment GET/read API becomes available in the future, post-delete
 * existence/non-existence check should be added for full assurance.
 */
export async function test_api_aimall_backend_seller_orders_shipments_test_delete_shipment_successfully_by_seller(
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
      },
    },
  );
  typia.assert(customer);

  // 2. Create a seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string>(),
          contact_phone: typia.random<string>(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 3. Create a product for the seller (even if not directly attached to the order for this test)
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          status: "active",
        },
      },
    );
  typia.assert(product);

  // 4. Register an address for the customer
  const address =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Home",
          recipient_name: RandomGenerator.name(),
          phone: typia.random<string>(),
          address_line1: RandomGenerator.paragraph()(),
          city: "Seoul",
          postal_code: "06236",
          country: "South Korea",
          is_default: true,
        },
      },
    );
  typia.assert(address);

  // 5. Create an order for this customer and seller
  const order = await api.functional.aimall_backend.seller.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: address.id,
        order_number: undefined,
        order_status: "pending",
        total_amount: 10000,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // 6. Create a shipment for the order
  const shipment =
    await api.functional.aimall_backend.seller.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          shipment_address_id: address.id,
          carrier: "CJ Logistics",
          tracking_number: "1Z999AA10123456784",
          shipment_status: "pending",
        },
      },
    );
  typia.assert(shipment);

  // 7. Delete the shipment
  await api.functional.aimall_backend.seller.orders.shipments.erase(
    connection,
    {
      orderId: order.id,
      shipmentId: shipment.id,
    },
  );

  // 8. Edge: Try fetching the shipment (simulate: expect failure)
  // (No shipment GET endpoint present; deletion is assumed successful if no error is thrown.)
}
