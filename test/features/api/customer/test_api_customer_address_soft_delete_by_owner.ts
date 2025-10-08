import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";

/**
 * Test soft deletion of a customer's own address (positive flow and edge
 * cases).
 *
 * Scenario: An authenticated customer (created via join) with a default address
 * and a shopping cart deletes their own address via DELETE
 * /shoppingMall/customer/customers/{customerId}/addresses/{addressId}. The test
 * verifies:
 *
 * - The registration and cart creation process for a new customer
 * - The structure a true address delete test would follow if addressId were
 *   available via the API
 *
 * NOTE: At present, IAuthorized returned by join does not expose address
 * information or addressId, nor is there an address list/read API available.
 * Therefore, a true address deletion test against a real addressId cannot be
 * conducted. This means we cannot perform or verify the actual delete. The code
 * below demonstrates the scaffold for real logic as soon as a listing/getting
 * API is present.
 *
 * Steps:
 *
 * 1. Register a new customer (capture returned IAuthorized)
 * 2. Create a cart for the customer
 * 3. [Pending addressId acquisition] Would delete address here when address API is
 *    exposed
 */
export async function test_api_customer_address_soft_delete_by_owner(
  connection: api.IConnection,
) {
  // 1. Register a customer with required default address
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    full_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    address: {
      recipient_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
      region: RandomGenerator.paragraph({ sentences: 2 }),
      postal_code: RandomGenerator.alphaNumeric(5),
      address_line1: RandomGenerator.paragraph({ sentences: 3 }),
      address_line2: RandomGenerator.paragraph({ sentences: 2 }),
      is_default: true,
    } satisfies IShoppingMallCustomerAddress.ICreate,
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: joinBody,
  });
  typia.assert(customerAuth);

  // 2. Customer creates a cart to ensure full customer initialization
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {},
    },
  );
  typia.assert(cart);
  TestValidator.equals(
    "cart customerId matches",
    cart.shopping_mall_customer_id,
    customerAuth.id,
  );

  // 3. [Test scaffold for delete] - When an endpoint becomes available to retrieve address IDs, perform:
  // await api.functional.shoppingMall.customer.customers.addresses.erase(connection, {
  //   customerId: customerAuth.id,
  //   addressId: addressIdHere,
  // });
  // Optionally run TestValidator.error for double delete or verify post-delete state if the address can be queried
}
