import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import type { IPageIShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCart";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * Validate that the seller cart search endpoint can filter by customer
 * association.
 *
 * This test checks whether a seller can successfully search for shopping
 * cart records associated with a particular customer. It ensures both
 * authentication and filtering logic function as intended. Note: Creation
 * of carts associated to a customer cannot be tested because no cart
 * creation endpoint exists in the provided API surface. Therefore, a
 * successful test is either empty result (no carts) or all carts with
 * customer_id matching the queried ID.
 *
 * Steps:
 *
 * 1. Register a seller and save authentication context (token set
 *    automatically).
 * 2. Register a customer and retrieve their id for filtering.
 * 3. (Cart creation skipped - no such API in provided functions.)
 * 4. While authenticated as the seller, call
 *    /shoppingMallAiBackend/seller/carts (PATCH) with body { customer_id }
 *    and validate results.
 * 5. Validate that all returned carts (if any) are associated with the given
 *    customer_id.
 */
export async function test_api_seller_cart_search_by_customer_association(
  connection: api.IConnection,
) {
  // 1. Register seller and authenticate
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);
  const seller = sellerAuth.seller;

  // 2. Register customer
  const customerInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(),
  };
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerInput,
  });
  typia.assert(customerAuth);
  const customer = customerAuth.customer;

  // 3. (No API for cart creation. This step is skipped.)

  // 4. As seller, search for carts associated with the customer_id
  const response =
    await api.functional.shoppingMallAiBackend.seller.carts.index(connection, {
      body: {
        customer_id: customer.id,
      } satisfies IShoppingMallAiBackendCart.IRequest,
    });
  typia.assert(response);

  // 5. Validate association: all results (if any) have correct customer_id
  TestValidator.equals(
    "all returned carts must match the filtered customer_id",
    response.data.every((cart) => cart.customer_id === customer.id),
    true,
  );
}
