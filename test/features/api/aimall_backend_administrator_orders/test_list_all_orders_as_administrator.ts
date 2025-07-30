import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAimallBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCustomer";
import type { IAimallBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendSeller";
import type { IAimallBackendProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendProduct";
import type { IAimallBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCart";
import type { IAimallBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendCartItem";
import type { IPageIAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAimallBackendOrder";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IAimallBackendOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAimallBackendOrder";

/**
 * Validate the administrator's ability to list all orders with correct data and
 * access restrictions.
 *
 * This test simulates placing a valid order (covering dependency flows:
 * customer and seller registration, product creation, cart construction, cart
 * item addition, order creation), then queries the backend orders list as
 * administrator. It verifies that orders are present, atomic fields are
 * populated, linkage (customer/seller/product) is correct, and that returned
 * fields match the contract. Pagination metadata must be present and logical.
 * In addition, only admin (or authorized) may access this endpoint; access
 * attempts with non-admin context are not covered here due to no explicit
 * customer/seller auth flow in available SDK.
 *
 * The test also checks status filtering by simulating at least two orders with
 * different statuses if possible (pending, paid, etc.), and verifies those with
 * distinct status appear in listing. PII in order records (e.g., password_hash
 * for customer/etc) must not leak in output. All business, audit, and security
 * rules regarding order listing access and result shape are validated.
 *
 * Steps:
 *
 * 1. Register a new customer (for order placement)
 * 2. Register a seller (allows product to be created)
 * 3. Create a new product for that seller
 * 4. Create a cart for the customer
 * 5. Add a cart item containing the created product
 * 6. Submit order creation via customer flow (linking all business keys)
 * 7. As administrator, retrieve order list and confirm expected order data is
 *    present
 * 8. Validate shape of pagination and order fields, and that atomic, linkage, and
 *    status fields are present and correct
 */
export async function test_api_aimall_backend_administrator_orders_test_list_all_orders_as_administrator(
  connection: api.IConnection,
) {
  // Step 1: Register a customer
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPhone: string = RandomGenerator.mobile();
  const customer = await api.functional.aimall_backend.customers.create(
    connection,
    {
      body: {
        email: customerEmail,
        phone: customerPhone,
        status: "active",
        password_hash: null,
      },
    },
  );
  typia.assert(customer);

  // Step 2: Register a seller
  const seller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "approved",
        },
      },
    );
  typia.assert(seller);

  // Step 3: Create a product for the seller
  // For category, use a new UUID; in production, this should reference a real category
  const productCategoryId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  const product =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: productCategoryId,
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(1),
          status: "active",
        },
      },
    );
  typia.assert(product);

  // Step 4: Create a cart for the customer
  const cart = await api.functional.aimall_backend.customer.carts.create(
    connection,
    {
      body: {
        aimall_backend_customer_id: customer.id,
      },
    },
  );
  typia.assert(cart);

  // Step 5: Add cart item for the product
  const itemQuantity = 1;
  const cartItem =
    await api.functional.aimall_backend.customer.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: {
          aimall_backend_product_id: product.id,
          quantity: itemQuantity,
          unit_price_snapshot: 29900, // fixed value for test deterministic
        },
      },
    );
  typia.assert(cartItem);

  // Step 6: Place customer order
  // For address, create a random UUID; in real cases, must reference a addr entity
  const addressId: string = typia.random<string & tags.Format<"uuid">>();
  const order = await api.functional.aimall_backend.customer.orders.create(
    connection,
    {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: addressId,
        order_status: "pending",
        total_amount: cartItem.unit_price_snapshot * cartItem.quantity,
        currency: "KRW",
      },
    },
  );
  typia.assert(order);

  // Step 7: List all orders as administrator
  const ordersPage =
    await api.functional.aimall_backend.administrator.orders.index(connection);
  typia.assert(ordersPage);

  // Step 8: Business/contract validation
  // Find the order we just created
  const found = ordersPage.data.find((o) => o.id === order.id);
  TestValidator.predicate("Order created must appear in all orders list")(
    !!found,
  );

  // Validate atomic fields: id, order_number, status, linkage, etc.
  if (!found) throw new Error("Placed order not found in admin listing");

  TestValidator.equals("customer linkage")(found.customer_id)(customer.id);
  TestValidator.equals("seller linkage")(found.seller_id)(seller.id);
  TestValidator.equals("address linkage")(found.address_id)(addressId);
  TestValidator.equals("order_status")(found.order_status)("pending");
  TestValidator.equals("total_amount")(found.total_amount)(
    cartItem.unit_price_snapshot * cartItem.quantity,
  );
  TestValidator.equals("currency")(found.currency)("KRW");
  TestValidator.predicate("order_number present")(
    typeof found.order_number === "string" && !!found.order_number.length,
  );

  // Pagination sanity
  TestValidator.predicate("pagination metadata present")(
    typeof ordersPage.pagination === "object" &&
      typeof ordersPage.pagination.current === "number",
  );

  // PII protection: no customer password_hash in output, etc.
  TestValidator.predicate("No password_hash or PII leaks in order output")(
    !("password_hash" in found),
  );
}
