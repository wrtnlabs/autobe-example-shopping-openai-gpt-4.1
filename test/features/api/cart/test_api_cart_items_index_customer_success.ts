import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallAiBackendCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCustomer";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAiBackendCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCart";
import type { IShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCartItem";
import type { IPageIShoppingMallAiBackendCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCartItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

/**
 * E2E test: Authenticated customer can paginate and retrieve their shopping
 * cart items.
 *
 * This test simulates a real-world scenario where a customer:
 *
 * 1. Registers and authenticates
 * 2. Creates a shopping cart
 * 3. Adds several unique items with distinct product_snapshot_ids and notes
 * 4. Invokes the PATCH /shoppingMallAiBackend/customer/carts/{cartId}/items
 *    endpoint to retrieve cart items
 * 5. Tests pagination, and both quantity and note_search filtering logic
 *
 * Steps:
 *
 * 1. Register and authenticate a customer. (Sets token in headers for
 *    subsequent requests.)
 * 2. Create a new cart as that customer with a unique token.
 * 3. Add NUM_ITEMS (5) items with unique product_snapshot_ids, random
 *    quantities, unique notes and option_codes.
 * 4. Retrieve all cart items (default pagination); assert count/fields.
 * 5. Paginate with limit=2; assert correct paging and content.
 * 6. Filter by quantity_min; assert all results meet filter criteria.
 * 7. Filter by note_search using an actual substring from a created note;
 *    assert matched notes.
 *
 * All SDK, typia, and E2E assertion best practices are followed.
 */
export async function test_api_cart_items_index_customer_success(
  connection: api.IConnection,
) {
  // 1. Customer registration & authentication
  const customerInput: IShoppingMallAiBackendCustomer.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    phone_number: RandomGenerator.mobile(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    nickname: RandomGenerator.name(1),
  };
  const customerAuth = await api.functional.auth.customer.join(connection, {
    body: customerInput,
  });
  typia.assert(customerAuth);
  TestValidator.equals(
    "customer email matches input",
    customerAuth.customer.email,
    customerInput.email,
  );

  // 2. Cart creation
  const cartInput: IShoppingMallAiBackendCart.ICreate = {
    shopping_mall_ai_backend_customer_id: customerAuth.customer.id,
    cart_token: RandomGenerator.alphaNumeric(24),
    status: "active",
    note: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const cart = await api.functional.shoppingMallAiBackend.customer.carts.create(
    connection,
    { body: cartInput },
  );
  typia.assert(cart);
  TestValidator.equals(
    "cart customer UUID matches",
    cart.shopping_mall_ai_backend_customer_id,
    customerAuth.customer.id,
  );

  // 3. Cart item creation
  const NUM_ITEMS = 5;
  const productSnapshotIds = ArrayUtil.repeat(NUM_ITEMS, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const notePatterns = ArrayUtil.repeat(
    NUM_ITEMS,
    (i) =>
      `note${i}_${RandomGenerator.paragraph({ sentences: 1, wordMin: 4, wordMax: 8 })}`,
  );
  const quantities = ArrayUtil.repeat(NUM_ITEMS, () =>
    typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  );
  const items: IShoppingMallAiBackendCartItem[] = [];
  for (let i = 0; i < NUM_ITEMS; ++i) {
    const createInput: IShoppingMallAiBackendCartItem.ICreate = {
      shopping_mall_ai_backend_cart_id: cart.id,
      shopping_mall_ai_backend_product_snapshot_id: productSnapshotIds[i],
      quantity: quantities[i],
      option_code: RandomGenerator.alphaNumeric(6),
      note: notePatterns[i],
    };
    const createdItem =
      await api.functional.shoppingMallAiBackend.customer.carts.items.create(
        connection,
        { cartId: cart.id, body: createInput },
      );
    typia.assert(createdItem);
    items.push(createdItem);
    TestValidator.equals(
      `cartId matches for created item #${i}`,
      createdItem.shopping_mall_ai_backend_cart_id,
      cart.id,
    );
    TestValidator.equals(
      `productSnapshotId matches for item #${i}`,
      createdItem.shopping_mall_ai_backend_product_snapshot_id,
      productSnapshotIds[i],
    );
    TestValidator.equals(
      `quantity matches for item #${i}`,
      createdItem.quantity,
      quantities[i],
    );
    TestValidator.equals(
      `note matches for item #${i}`,
      createdItem.note,
      notePatterns[i],
    );
  }

  // 4. Retrieve all items (default pagination)
  const pageDefault =
    await api.functional.shoppingMallAiBackend.customer.carts.items.index(
      connection,
      {
        cartId: cart.id,
        body: {},
      },
    );
  typia.assert(pageDefault);
  TestValidator.equals(
    "default pagination current page",
    pageDefault.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination limit",
    pageDefault.pagination.limit,
    10,
  );
  TestValidator.equals(
    "record count matches",
    pageDefault.pagination.records,
    NUM_ITEMS,
  );
  TestValidator.equals("page count logic", pageDefault.pagination.pages, 1);
  TestValidator.equals(
    "all items returned",
    pageDefault.data.length,
    NUM_ITEMS,
  );

  // 5. Pagination with limit=2
  const pageLimit2 =
    await api.functional.shoppingMallAiBackend.customer.carts.items.index(
      connection,
      {
        cartId: cart.id,
        body: { page: 1, limit: 2 },
      },
    );
  typia.assert(pageLimit2);
  TestValidator.equals(
    "page=1, limit=2: current page",
    pageLimit2.pagination.current,
    1,
  );
  TestValidator.equals(
    "page=1, limit=2: limit matches",
    pageLimit2.pagination.limit,
    2,
  );
  TestValidator.equals(
    "page=1, limit=2: record count",
    pageLimit2.pagination.records,
    NUM_ITEMS,
  );
  TestValidator.equals(
    "page=1, limit=2: page count logic",
    pageLimit2.pagination.pages,
    Math.ceil(NUM_ITEMS / 2),
  );
  TestValidator.equals(
    "page=1, limit=2: item count in page",
    pageLimit2.data.length,
    2,
  );
  TestValidator.equals(
    "page=1, limit=2: first item matches",
    pageLimit2.data[0].id,
    items[0].id,
  );
  TestValidator.equals(
    "page=1, limit=2: second item matches",
    pageLimit2.data[1].id,
    items[1].id,
  );

  // 6. Filter by quantity_min
  const minQuantity = Math.min(...quantities);
  const filteredByQuantity =
    await api.functional.shoppingMallAiBackend.customer.carts.items.index(
      connection,
      {
        cartId: cart.id,
        body: { quantity_min: minQuantity },
      },
    );
  typia.assert(filteredByQuantity);
  TestValidator.predicate(
    "all filtered items have quantity >= minQuantity",
    filteredByQuantity.data.every((item) => item.quantity >= minQuantity),
  );

  // 7. Filter by note_search
  const noteSubstring = notePatterns[2].slice(0, 5);
  const filteredByNote =
    await api.functional.shoppingMallAiBackend.customer.carts.items.index(
      connection,
      {
        cartId: cart.id,
        body: { note_search: noteSubstring },
      },
    );
  typia.assert(filteredByNote);
  TestValidator.predicate(
    "note_search filter returns correct items",
    filteredByNote.data.every(
      (item) =>
        item.note !== undefined &&
        item.note !== null &&
        item.note.includes(noteSubstring),
    ),
  );
}
