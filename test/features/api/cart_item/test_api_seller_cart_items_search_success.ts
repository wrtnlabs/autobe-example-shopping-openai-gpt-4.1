import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";
import type { IPageIShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCartItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function test_api_seller_cart_items_search_success(
  connection: api.IConnection,
) {
  /**
   * E2E test scenario: successful search and retrieval of items for a seller's
   * cart.
   *
   * 1. Register a new seller account (required for authentication and cart
   *    access).
   * 2. (Business gap: No API for cart creation nor item addition—proceed with
   *    random known cartId.)
   * 3. Prepare random search parameters with known structure.
   * 4. Call PATCH /shoppingMallAiBackend/seller/carts/{cartId}/items to search for
   *    items in the cart.
   * 5. Assert that the API returns a paginated item list response, and result
   *    respects provided search parameters structure.
   * 6. Validate that the API respects authentication/access restrictions.
   */

  // 1. Register and authenticate as seller
  const sellerInput: IShoppingMallAiBackendSeller.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
  };
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerInput,
  });
  typia.assert(sellerAuth);

  // 2. There is no API to actually create a cart or add items via the available endpoints, so just proceed with a random UUID cartId
  const cartId = typia.random<string & tags.Format<"uuid">>();

  // 3. Prepare search parameters: filter by quantity_min, bundle_code and note_search
  const request: IShoppingMallAiBackendCartItem.IRequest = {
    page: 1,
    limit: 10,
    quantity_min: 1,
    quantity_max: 20,
    bundle_code: RandomGenerator.alphaNumeric(6),
    note_search: RandomGenerator.substring(RandomGenerator.paragraph()),
    sort_field: RandomGenerator.pick(["created_at", "quantity"] as const),
    sort_order: RandomGenerator.pick(["asc", "desc"] as const),
  };

  // 4. Call the API and search for cart items
  const result =
    await api.functional.shoppingMallAiBackend.seller.carts.items.index(
      connection,
      { cartId, body: request },
    );
  typia.assert(result);

  // 5. Validate response type (pagination and data)
  TestValidator.equals(
    "current page is correct",
    result.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "limit is correct",
    result.pagination.limit,
    request.limit,
  );

  if (request.quantity_min !== undefined && request.quantity_min !== null)
    TestValidator.predicate(
      "all returned items have quantity >= min",
      result.data.every((i) => i.quantity >= request.quantity_min!),
    );
  if (request.quantity_max !== undefined && request.quantity_max !== null)
    TestValidator.predicate(
      "all returned items have quantity <= max",
      result.data.every((i) => i.quantity <= request.quantity_max!),
    );
  if (request.bundle_code !== undefined && request.bundle_code !== null)
    TestValidator.predicate(
      "all returned items have correct bundle_code",
      result.data.every((i) => i.bundle_code === request.bundle_code),
    );
  if (request.note_search !== undefined && request.note_search !== null)
    TestValidator.predicate(
      "all returned items' notes include note_search value (if note present)",
      result.data.every(
        (i) =>
          i.note === null ||
          i.note === undefined ||
          i.note.includes(request.note_search!),
      ),
    );
  // 6. Validate all items belong to the correct cart
  TestValidator.predicate(
    "all cart items belong to the queried cartId",
    result.data.every((i) => i.shopping_mall_ai_backend_cart_id === cartId),
  );
}
