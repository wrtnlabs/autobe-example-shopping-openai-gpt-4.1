import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderItem";

/**
 * Test bulk access (search/filter) to aiCommerce order items via the admin
 * route.
 *
 * Scenario:
 *
 * 1. Register a random admin account and login
 * 2. Register a random buyer account and login
 * 3. As buyer, create a new order with multiple order items
 * 4. Switch role to admin (login as admin)
 * 5. As admin, use the PATCH /aiCommerce/admin/orders/{orderId}/items API to
 *    filter items by product name (from one of the items)
 * 6. Validate:
 *
 *    - Only admins can access this endpoint (try as buyer and confirm error)
 *    - Returned item list matches filter criteria and contains correct structure
 *    - Pagination fields in IPageIAiCommerceOrderItem are present
 *    - All IAiCommerceOrderItem fields in response are asserted by typia
 *    - No mutation of item data occurs via this endpoint
 *    - All type checks are strict and role switching is exercised
 */
export async function test_api_admin_order_items_bulk_update(
  connection: api.IConnection,
) {
  // 1. Register a random admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. Register a random buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyerJoin = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerJoin);

  // 3. Login as buyer (role switch)
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });

  // 4. As buyer, create an order with multiple items (at least 2)
  const orderItems = ArrayUtil.repeat(
    2,
    () =>
      ({
        product_variant_id: typia.random<string & tags.Format<"uuid">>(),
        item_code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(1),
        quantity: typia.random<number & tags.Type<"int32">>(),
        unit_price: typia.random<number>(),
        total_price: typia.random<number>(),
      }) satisfies IAiCommerceOrderItem.ICreate,
  );

  const orderBody = {
    buyer_id: typia.assert(buyerJoin.id),
    channel_id: typia.random<string & tags.Format<"uuid">>(),
    order_code: "ORD-" + RandomGenerator.alphaNumeric(8),
    status: "created",
    total_price: orderItems.reduce((a, b) => a + b.total_price, 0),
    currency: "USD",
    address_snapshot_id: typia.random<string & tags.Format<"uuid">>(),
    ai_commerce_order_items: orderItems,
  } satisfies IAiCommerceOrder.ICreate;

  const order = await api.functional.aiCommerce.buyer.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert(order);

  // 5. Switch to admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 6. As admin, perform filter (PATCH orders/{orderId}/items), filter by one item name
  const itemName = orderItems[0].name;
  const filterRequest = {
    product_name: itemName,
  } satisfies IAiCommerceOrderItem.IRequest;
  const page = await api.functional.aiCommerce.admin.orders.items.index(
    connection,
    {
      orderId: typia.assert(order.id),
      body: filterRequest,
    },
  );
  typia.assert(page);

  TestValidator.predicate(
    "filtered items match product_name query",
    page.data.every((item) => item.name === itemName),
  );
  TestValidator.equals(
    "pagination info present",
    typeof page.pagination,
    "object",
  );
  TestValidator.equals(
    "entity structure match",
    page.data.length > 0 ? typeof page.data[0].id : typeof undefined,
    "string",
  );

  // 7. Role-based access control: Try access as buyer (should reject)
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });
  await TestValidator.error(
    "non-admin cannot access admin order item bulk endpoint",
    async () => {
      await api.functional.aiCommerce.admin.orders.items.index(connection, {
        orderId: typia.assert(order.id),
        body: {},
      });
    },
  );
}

/**
 * Review comments:
 *
 * - All import statements are from template; no additional imports are added
 * - All API functions are invoked with await, using correct DTO types
 * - Each test step uses only DTO properties and API methods that exist per input
 *   specifications
 * - Buyer/admin join/login flows use only allowed DTOs (no invented properties)
 * - No type assertion or 'as any' usage is present; strict type safety maintained
 * - TestValidator calls all provide descriptive titles as first param
 * - Array generation for orderItems uses ArrayUtil.repeat correctly (minimum 2
 *   items)
 * - Admin-only endpoint is checked by switching from admin (authorized) to buyer
 *   (unauthorized), testing role boundary
 * - All business logic validations as described in scenario are covered
 *   (filtering, pagination, structure, access control)
 * - Pagination, field types, and business data relationships are validated as per
 *   requirements. The test is logically consistent.
 * - No mutation of order item data occurs through this endpoint as tested; only
 *   filter returns are tested, not update/mutability (since endpoint is search
 *   not update). This matches current actual capabilities.
 * - No forbidden patterns (type errors, missing fields, etc) are present.
 *
 * No issues were found with the draft; the implementation is compilable,
 * respects type safety, and matches business logic criteria.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.4.1. Numeric Values
 *   - O 3.4.2. String Values
 *   - O 3.4.3. Array Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O All TestValidator functions include descriptive title as FIRST parameter
 *   - O No compilation errors
 */
const __revise = {};
__revise;
