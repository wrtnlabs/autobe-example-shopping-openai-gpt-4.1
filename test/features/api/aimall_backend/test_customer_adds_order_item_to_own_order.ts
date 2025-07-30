import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";
import type { IAimallBackendOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrderItem";

/**
 * Validate that a customer can add an item to their own order.
 *
 * Business context: Customers must be able to add products to their existing
 * orders, as long as the order belongs to them and is open for modification.
 * This test covers the full workflow from customer registration, catalog
 * product setup, order creation, through adding an order item with valid
 * schema-compliant fields.
 *
 * 1. Register a new customer (with unique email and phone).
 * 2. Register a new product in the catalog (must be active, linked to some seller
 *    and category).
 * 3. Create a new order for this customer, picking the product's seller as order
 *    seller, and using a valid dummy address id.
 * 4. Add a new item to this order as the customer, providing product_id,
 *    item_name, quantity, unit_price, and total_price.
 *
 *    - The item_name should match the product title.
 *    - Product_option_id can be skipped or set to null if product has no options.
 * 5. Assert item is created successfully and its data matches what was sent.
 */
export async function test_api_aimall_backend_test_customer_adds_order_item_to_own_order(
  connection: api.IConnection,
) {
  // 1. Register a new customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPhone = RandomGenerator.mobile();
  const customerStatus = "active";
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerEmail,
        phone: customerPhone,
        password_hash: null, // simulate external auth or skip for test
        status: customerStatus,
      } satisfies IAimallBackendCustomer.ICreate,
    },
  );
  typia.assert(customer);
  TestValidator.equals("customer email")(customer.email)(customerEmail);
  TestValidator.equals("customer phone")(customer.phone)(customerPhone);
  TestValidator.equals("customer status")(customer.status)(customerStatus);

  // 2. Register a product in catalog
  // The product must have a seller and category; use random UUIDs for category_id and seller_id
  const productSellerId = typia.random<string & tags.Format<"uuid">>();
  const productCategoryId = typia.random<string & tags.Format<"uuid">>();
  const productStatus = "active";
  const productTitle = RandomGenerator.paragraph()(2);
  const productDescription = RandomGenerator.content()(2)();
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: productCategoryId,
          seller_id: productSellerId,
          title: productTitle,
          description: productDescription,
          status: productStatus,
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);
  TestValidator.equals("product title")(product.title)(productTitle);
  TestValidator.equals("product status")(product.status)(productStatus);

  // 3. Create a new order for this customer using the product's seller, and a dummy address id
  const orderStatus = "pending";
  const dummyAddressId = typia.random<string & tags.Format<"uuid">>();
  const currency = "KRW";
  const totalAmount = 0; // Start with 0, will increase with items
  const order = await api.functional.aimall_backend.administrator.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: product.seller_id,
        address_id: dummyAddressId,
        order_status: orderStatus,
        total_amount: totalAmount,
        currency: currency,
      } satisfies IAimallBackendOrder.ICreate,
    },
  );
  typia.assert(order);
  TestValidator.equals("order customer")(order.customer_id)(customer.id);
  TestValidator.equals("order seller")(order.seller_id)(product.seller_id);
  TestValidator.equals("order total_amount")(order.total_amount)(totalAmount);
  TestValidator.equals("order status")(order.order_status)(orderStatus);

  // 4. Add a valid order item as the customer to their order
  const quantity: number & tags.Type<"int32"> = 2;
  const unitPrice: number = 12345;
  const orderItemName = product.title;
  const orderItemBody: IAimallBackendOrderItem.ICreate = {
    product_id: product.id,
    // Product_option_id is optional and can be omitted or set to null (simulate no options case)
    product_option_id: null,
    item_name: orderItemName,
    quantity: quantity,
    unit_price: unitPrice,
    total_price: quantity * unitPrice,
  };

  const orderItem =
    await api.functional.aimall_backend.customer.orders.orderItems.create(
      connection,
      {
        orderId: order.id,
        body: orderItemBody,
      },
    );
  typia.assert(orderItem);
  // Assert returned order item matches request
  TestValidator.equals("order item: order id")(orderItem.order_id)(order.id);
  TestValidator.equals("order item: product id")(orderItem.product_id)(
    product.id,
  );
  TestValidator.equals("order item: item name")(orderItem.item_name)(
    orderItemName,
  );
  TestValidator.equals("order item: quantity")(orderItem.quantity)(quantity);
  TestValidator.equals("order item: unit price")(orderItem.unit_price)(
    unitPrice,
  );
  TestValidator.equals("order item: total price")(orderItem.total_price)(
    orderItemBody.total_price,
  );
  TestValidator.equals("order item: option id")(orderItem.product_option_id)(
    null,
  );
}
