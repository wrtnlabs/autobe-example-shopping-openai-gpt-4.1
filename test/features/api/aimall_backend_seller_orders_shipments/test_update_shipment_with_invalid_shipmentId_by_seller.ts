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
 * Test updating a shipment with an invalid shipmentId under a valid order as a
 * seller.
 *
 * Business context: This test verifies that when a seller attempts to update a
 * shipment for an existing order but provides an invalid shipmentId (i.e., one
 * that does not exist for the order), the API should return a 404 Not Found or
 * a meaningful error, and no state should be changed for any shipment records.
 *
 * Steps:
 *
 * 1. Create a customer (for order context).
 * 2. Create a seller (for shipment context).
 * 3. Create a product owned by the seller (necessary to connect order to seller).
 * 4. Register a valid delivery address for the customer.
 * 5. Create an order for the seller from the customer with the registered address
 *    and product.
 * 6. Attempt to update a shipment for the created order, but supply a shipmentId
 *    that does NOT exist.
 * 7. Confirm that the update fails with a 404 or suitable error, and no data is
 *    changed.
 */
export async function test_api_aimall_backend_seller_orders_shipments_test_update_shipment_with_invalid_shipmentId_by_seller(
  connection: api.IConnection,
) {
  // 1. Create customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string>(),
        phone: typia.random<string>(),
        status: "active",
      },
    },
  );
  typia.assert(customer);

  // 2. Create seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: typia.random<string>(),
          email: typia.random<string>(),
          contact_phone: typia.random<string>(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // 3. Create product attached to seller
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: typia.random<string>(),
          status: "active",
        },
      },
    );
  typia.assert(product);

  // 4. Register address for customer
  const address =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Home",
          recipient_name: "홍길동",
          phone: typia.random<string>(),
          address_line1: "서울시 강남구 테헤란로 123",
          city: "서울시",
          postal_code: "06134",
          country: "KR",
          is_default: true,
        },
      },
    );
  typia.assert(address);

  // 5. Create order for customer on product
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
      },
    },
  );
  typia.assert(order);

  // 6. Attempt to update shipment with a non-existent shipmentId
  const invalidShipmentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error("Updating with invalid shipmentId returns error")(
    async () => {
      await api.functional.aimall_backend.seller.orders.shipments.update(
        connection,
        {
          orderId: order.id,
          shipmentId: invalidShipmentId,
          body: {
            carrier: "CJ Logistics",
            shipment_status: "shipped",
          },
        },
      );
    },
  );
}
