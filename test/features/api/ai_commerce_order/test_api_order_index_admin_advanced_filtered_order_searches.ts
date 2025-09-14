import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCart";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrder";

/**
 * Test that an admin can retrieve a paginated list of all orders using
 * advanced filtering (status, buyer, channel, date range, business status,
 * price range).
 *
 * 1. Register a new buyer (unique email/password)
 * 2. Buyer logs in
 * 3. Buyer creates a cart
 * 4. Buyer places an order with required fields and items
 * 5. Register an admin (unique email/password/status)
 * 6. Admin logs in
 * 7. Admin invokes /aiCommerce/admin/orders with filter criteria for search:
 *    status, buyer_id, channel_id, date range, business_status, min/max
 *    total_price, page, limit, sort
 * 8. Test verifies:
 *
 *    - Paging metadata fields present and valid (pagination fields in response)
 *    - Orders returned match expected filters (especially by buyer_id, status,
 *         etc)
 *    - Order business fields (order_code, status, dates, total_price) are
 *         present
 *    - Analytics/compliance metadata is valid
 */
export async function test_api_order_index_admin_advanced_filtered_order_searches(
  connection: api.IConnection,
) {
  // Generate buyer credentials
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);

  // 1. Register buyer
  const buyerJoin = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerJoin);

  // 2. Buyer logs in
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });

  // 3. Buyer creates a cart
  const cart = await api.functional.aiCommerce.buyer.carts.create(connection, {
    body: {
      buyer_id: buyerJoin.id,
      status: "active",
      total_quantity: 1,
    } satisfies IAiCommerceCart.ICreate,
  });
  typia.assert(cart);

  // 4. Buyer places an order (with required fields, reference to cart)
  const product_variant_id = typia.random<string & tags.Format<"uuid">>();
  const orderItem = {
    product_variant_id,
    item_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    quantity: 1,
    unit_price: 1000,
    total_price: 1000,
  } satisfies IAiCommerceOrderItem.ICreate;
  const channel_id = typia.random<string & tags.Format<"uuid">>();
  const order_code = "ORD-" + RandomGenerator.alphaNumeric(8).toUpperCase();
  const address_snapshot_id = typia.random<string & tags.Format<"uuid">>();

  const order = await api.functional.aiCommerce.buyer.orders.create(
    connection,
    {
      body: {
        buyer_id: buyerJoin.id,
        channel_id,
        order_code,
        status: "created",
        total_price: 1000,
        currency: "USD",
        address_snapshot_id,
        ai_commerce_order_items: [orderItem],
      } satisfies IAiCommerceOrder.ICreate,
    },
  );
  typia.assert(order);

  // 5. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const adminStatus = "active";

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: adminStatus,
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 6. Admin logs in
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 7. Admin invokes advanced filtered order search
  const today = new Date();
  const filterBody = {
    status: order.status,
    buyer_id: order.buyer_id,
    channel_id: order.channel_id,
    business_status: order.business_status ?? undefined,
    from_date: today.toISOString().slice(0, 10),
    to_date: today.toISOString().slice(0, 10),
    min_total_price: order.total_price,
    max_total_price: order.total_price,
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort_by: "created_at",
    sort_dir: "desc",
  } satisfies IAiCommerceOrder.IRequest;

  const pageResult = await api.functional.aiCommerce.admin.orders.index(
    connection,
    {
      body: filterBody,
    },
  );
  typia.assert(pageResult);

  // 8. Assert paging metadata fields are present and valid
  TestValidator.predicate(
    "pagination current > 0",
    pageResult.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    pageResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    pageResult.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination records >= 1",
    pageResult.pagination.records >= 1,
  );
  TestValidator.predicate(
    "at least one order returned",
    pageResult.data.length >= 1,
  );

  // 9. Verify found order matches filter and business fields are present
  const foundOrder = pageResult.data.find((o) => o.id === order.id);
  typia.assertGuard(foundOrder!);
  TestValidator.equals("order status matches", foundOrder.status, order.status);
  TestValidator.equals(
    "order buyer_id matches",
    foundOrder.buyer_id,
    order.buyer_id,
  );
  TestValidator.equals(
    "order channel_id matches",
    foundOrder.channel_id,
    order.channel_id,
  );
  TestValidator.equals(
    "order total_price matches",
    foundOrder.total_price,
    order.total_price,
  );
  TestValidator.equals(
    "order order_code matches",
    foundOrder.order_code,
    order.order_code,
  );
  TestValidator.equals(
    "order created_at present",
    typeof foundOrder.created_at,
    "string",
  );
  TestValidator.equals(
    "order updated_at present",
    typeof foundOrder.updated_at,
    "string",
  );
}

/**
 * - All required steps are logically ordered and each workflow step is
 *   implemented (buyer join/login, cart creation, order creation, admin
 *   join/login, order search).
 * - No import statements added; only template-provided imports are used. Valid.
 * - All DTO type variants match their operation (ICreate types on POSTs, IRequest
 *   for order search, etc.).
 * - All request properties only use schema-valid fields. No extra/missing
 *   properties found.
 * - All random value generation follows type and tag conventions (e.g.,
 *   typia.random for uuids/emails, RandomGenerator alphaNumeric/name for
 *   strings).
 * - No 'as any', missing required fields, or type mismatches.
 * - All api.functional.* calls are awaited. Verified. All TestValidator.error
 *   async calls use await.
 * - All TestValidator functions are used with title as first parameter. Valid.
 * - No type error tests or HTTP status assertions.
 * - Pagination field assertions and business logic assertions are present and
 *   meaningful.
 * - Null/undefined handling: business_status can be undefined; properly handled.
 * - Final response type is asserted, and presence of correct fields is validated
 *   both structurally (typia.assert) and logically (TestValidator.equals /
 *   predicate).
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.4.1. Numeric Values
 *   - O 3.4.2. String Values
 *   - O 3.4.3. Array Generation
 *   - O 3.4.3. Working with Typia Tagged Types
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O All TestValidator functions include descriptive title as FIRST parameter
 *   - O NO type error tests
 */
const __revise = {};
__revise;
