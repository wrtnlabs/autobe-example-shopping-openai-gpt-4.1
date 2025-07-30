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
 * Validates that shipment tracking numbers are unique per order.
 *
 * This test ensures the business logic prohibits creating multiple shipments
 * for the same order with duplicate tracking numbers. The full E2E flow:
 *
 * 1. Register a customer account
 * 2. Register a seller account
 * 3. Register a product for the seller (with a valid category id)
 * 4. Create a shipping address for the customer
 * 5. Place an order (administrator flow)
 * 6. Create the first shipment with a chosen tracking number
 * 7. Attempt to create a second shipment for the same order, reusing the identical
 *    tracking number
 * 8. Assert an error/conflict is produced
 */
export async function test_api_aimall_backend_administrator_orders_shipments_test_create_order_shipment_with_duplicate_tracking_number(
  connection: api.IConnection,
) {
  // 1. Create customer
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        phone: RandomGenerator.mobile(),
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);

  // 2. Create seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.alphabets(8),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 3. Create product (category_id is required, generate a random UUID for this test)
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(1),
          description: RandomGenerator.content()()(),
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 4. Create customer address
  const address =
    await api.functional.aimall_backend.customer.customers.addresses.create(
      connection,
      {
        customerId: customer.id,
        body: {
          alias: "Home",
          recipient_name: RandomGenerator.name(),
          phone: RandomGenerator.mobile(),
          address_line1: "123 Main St",
          city: "Seoul",
          postal_code: "06400",
          country: "South Korea",
          is_default: true,
        } satisfies IAimallBackendAddress.ICreate,
      },
    );
  typia.assert(address);

  // 5. Create order (admin flow)
  const order = await api.functional.aimall_backend.administrator.orders.create(
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

  // 6. Create first shipment with a unique tracking number
  const trackingNumber = RandomGenerator.alphaNumeric(16);
  const shipment1 =
    await api.functional.aimall_backend.administrator.orders.shipments.create(
      connection,
      {
        orderId: order.id,
        body: {
          order_id: order.id,
          shipment_address_id: address.id,
          carrier: "CJ Logistics",
          tracking_number: trackingNumber,
          shipment_status: "pending",
        } satisfies IAimallBackendShipment.ICreate,
      },
    );
  typia.assert(shipment1);
  TestValidator.equals("tracking number matches")(shipment1.tracking_number)(
    trackingNumber,
  );

  // 7. Try creating a second shipment with the same tracking number; must fail
  await TestValidator.error("duplicate tracking_number should fail")(
    async () => {
      await api.functional.aimall_backend.administrator.orders.shipments.create(
        connection,
        {
          orderId: order.id,
          body: {
            order_id: order.id,
            shipment_address_id: address.id,
            carrier: "CJ Logistics",
            tracking_number: trackingNumber,
            shipment_status: "pending",
          } satisfies IAimallBackendShipment.ICreate,
        },
      );
    },
  );
}
