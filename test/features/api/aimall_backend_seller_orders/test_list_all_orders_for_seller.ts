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
 * Test listing all orders for a seller (seller perspective).
 *
 * This test verifies that a seller can view only their own orders using the
 * seller orders endpoint, and does not see orders from other sellers.
 *
 * Workflow:
 *
 * 1. Register a new seller account.
 * 2. Register a product for that seller as an administrator.
 * 3. Register a new customer account.
 * 4. Create a cart for the customer.
 * 5. Add the seller's product to the customer's cart.
 * 6. As the customer, place an order for the product (address is stubbed).
 * 7. As the seller, retrieve their order list via /seller/orders.
 * 8. Validate:
 *
 *    - All orders returned belong to this seller.
 *    - The created order is present in the list and its details match.
 *    - There are no orders for unrelated sellers.
 */
export async function test_api_aimall_backend_seller_orders_test_list_all_orders_for_seller(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: sellerEmail,
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(seller);

  // 2. Register a product for the seller
  const product: IAimallBackendProduct =
    await api.functional.aimall_backend.administrator.products.create(
      connection,
      {
        body: {
          category_id: typia.random<string & tags.Format<"uuid">>(),
          seller_id: seller.id,
          title: RandomGenerator.paragraph()(),
          description: RandomGenerator.content()()(),
          main_thumbnail_uri: undefined,
          status: "active",
        } satisfies IAimallBackendProduct.ICreate,
      },
    );
  typia.assert(product);

  // 3. Register a customer
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IAimallBackendCustomer =
    await api.functional.aimall_backend.customers.create(connection, {
      body: {
        email: customerEmail,
        phone: RandomGenerator.mobile(),
        password_hash: null,
        status: "active",
      } satisfies IAimallBackendCustomer.ICreate,
    });
  typia.assert(customer);

  // 4. Create a cart for the customer
  const cart: IAimallBackendCart =
    await api.functional.aimall_backend.customer.carts.create(connection, {
      body: {
        aimall_backend_customer_id: customer.id,
      } satisfies IAimallBackendCart.ICreate,
    });
  typia.assert(cart);

  // 5. Add the seller's product to the cart
  const cartItem: IAimallBackendCartItem =
    await api.functional.aimall_backend.customer.carts.cartItems.create(
      connection,
      {
        cartId: cart.id,
        body: {
          aimall_backend_product_id: product.id,
          quantity: 1,
          unit_price_snapshot: 10000,
        } satisfies IAimallBackendCartItem.ICreate,
      },
    );
  typia.assert(cartItem);

  // 6. Stub: create a delivery address UUID for the order
  const addressId = typia.random<string & tags.Format<"uuid">>();

  // 7. Submit an order as the customer, referencing the seller's product and address
  const order: IAimallBackendOrder =
    await api.functional.aimall_backend.customer.orders.create(connection, {
      body: {
        customer_id: customer.id,
        seller_id: seller.id,
        address_id: addressId,
        order_status: "pending",
        total_amount: cartItem.unit_price_snapshot * cartItem.quantity,
        currency: "KRW",
      } satisfies IAimallBackendOrder.ICreate,
    });
  typia.assert(order);

  // 8. Seller retrieves their order list
  const page: IPageIAimallBackendOrder =
    await api.functional.aimall_backend.seller.orders.index(connection);
  typia.assert(page);

  // 9. Validate all returned orders belong to the seller
  TestValidator.predicate("All orders should belong to the seller")(
    page.data.every((o) => o.seller_id === seller.id),
  );

  // 10. Validate the created order is in the result with correct details
  const found = page.data.find((o) => o.id === order.id);
  TestValidator.predicate("Created order should be present in result")(!!found);
  TestValidator.equals("Order's seller ID matches")(found?.seller_id)(
    seller.id,
  );
  TestValidator.equals("Order's customer ID matches")(found?.customer_id)(
    customer.id,
  );
  TestValidator.equals("Order's total amount matches")(found?.total_amount)(
    order.total_amount,
  );

  // 11. Register another seller, ensure orders from them do not appear here
  const otherSeller: IAimallBackendSeller =
    await api.functional.aimall_backend.administrator.sellers.create(
      connection,
      {
        body: {
          business_name: RandomGenerator.name(),
          email: typia.random<string & tags.Format<"email">>(),
          contact_phone: RandomGenerator.mobile(),
          status: "active",
        } satisfies IAimallBackendSeller.ICreate,
      },
    );
  typia.assert(otherSeller);
  TestValidator.predicate("No order belongs to unrelated sellers")(
    page.data.every((o) => o.seller_id !== otherSeller.id),
  );
}
