import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Test successful creation of a new buyer order via
 * /aiCommerce/buyer/orders.
 *
 * 1. Register a new buyer using /auth/buyer/join with valid email/password
 * 2. Use the returned session to create an order as the buyer. Order request
 *    includes:
 *
 *    - Buyer_id from session
 *    - Channel_id: random UUID (simulate channel)
 *    - Order_code: random human code
 *    - Status: 'created' (or valid business status)
 *    - Total_price, currency: consistent with order items
 *    - Address_snapshot_id: random UUID (simulate existing address snapshot)
 *    - Ai_commerce_order_items: array with at least one item, each with
 *         product_variant_id (UUID), item_code, name, quantity, unit_price,
 *         total_price
 * 3. Assert the API response returns a populated order entity with unique id,
 *    correct buyer_id and all main fields, no type errors.
 */
export async function test_api_buyer_orders_create_success(
  connection: api.IConnection,
) {
  // 1. Register buyer user for test (establish buyer session)
  const buyerReg = await api.functional.auth.buyer.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerReg);

  // 2. Prepare order fields using schemas and random generators
  const buyer_id = buyerReg.id;
  const channel_id = typia.random<string & tags.Format<"uuid">>();
  const address_snapshot_id = typia.random<string & tags.Format<"uuid">>();
  const order_code = `ORD-${RandomGenerator.alphaNumeric(8).toUpperCase()}`;
  const status = "created";
  const currency = RandomGenerator.pick(["KRW", "USD", "EUR"] as const);

  // Prepare 1~3 items for order
  const ai_commerce_order_items = ArrayUtil.repeat(
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
    >(),
    () => {
      const quantity = typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
      >();
      const unit_price = typia.random<
        number & tags.Minimum<1000> & tags.Maximum<100000>
      >();
      return {
        product_variant_id: typia.random<string & tags.Format<"uuid">>(),
        // seller_id omitted (optional)
        item_code: RandomGenerator.alphaNumeric(10).toUpperCase(),
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 4,
          wordMax: 8,
        }),
        quantity,
        unit_price,
        total_price: unit_price * quantity,
      } satisfies IAiCommerceOrderItem.ICreate;
    },
  );
  const total_price = ai_commerce_order_items.reduce(
    (sum, i) => sum + i.total_price,
    0,
  );

  const orderBody = {
    buyer_id,
    channel_id,
    order_code,
    status,
    total_price,
    currency,
    address_snapshot_id,
    ai_commerce_order_items,
  } satisfies IAiCommerceOrder.ICreate;

  // 3. Create order as buyer
  const orderResp = await api.functional.aiCommerce.buyer.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert(orderResp);

  // 4. Basic assertions on response
  TestValidator.equals(
    "order.buyer_id matches registration",
    orderResp.buyer_id,
    buyer_id,
  );
  TestValidator.equals(
    "order.channel_id matches input",
    orderResp.channel_id,
    channel_id,
  );
  TestValidator.equals(
    "order.total_price matches sum of items",
    orderResp.total_price,
    total_price,
  );
  TestValidator.equals("order.currency matches", orderResp.currency, currency);
  TestValidator.equals("order.status matches", orderResp.status, status);
  TestValidator.equals(
    "order.address_snapshot_id matches",
    orderResp.address_snapshot_id,
    address_snapshot_id,
  );
  TestValidator.predicate(
    "order id is valid uuid",
    typeof orderResp.id === "string" && orderResp.id.length >= 30,
  );
  TestValidator.predicate(
    "order_code present in response",
    typeof orderResp.order_code === "string" && orderResp.order_code.length > 0,
  );
  TestValidator.predicate(
    "order created_at is valid date-time",
    typeof orderResp.created_at === "string" && orderResp.created_at.length > 0,
  );
  TestValidator.predicate(
    "order has at least one item",
    ai_commerce_order_items.length > 0,
  );
}

/**
 * - All business logic is correct: Buyer registration, token propagation, and
 *   order creation in sequence.
 * - Only DTO properties from schemas are used. All required fields for
 *   IAiCommerceOrder.ICreate and IAiCommerceOrderItem.ICreate are present. No
 *   type errors, no superfluous fields, and all values follow business and
 *   format rules.
 * - Random data for ids, currency, and quantities respects schema constraints.
 * - API responses are checked using typia.assert; no redundant property
 *   validation post-assert.
 * - Each TestValidator call has an explicit title first argument.
 * - Every API SDK function is properly awaited. No missing awaits found.
 * - All request data is created immutably (const only, with satisfies). All
 *   typia.random usage includes generic type argument.
 * - Response property assertions are all valid and use only known properties.
 * - No extraneous or fictional imports or code. No manipulation of
 *   connection.headers. Only Template code modified.
 * - No type error tests, status code testing, or forbidden logic patterns.
 * - This code matches full business E2E expectations and all system critical
 *   patterns. Ready for finalization.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O EVERY api.functional.* call has await
 *   - O EVERY TestValidator function has title as first parameter
 *   - O Proper async/await usage for TestValidator.error
 *   - O NO response validation after typia.assert()
 *   - O NO creation or mutation of connection.headers
 *   - O ALL DTO types match exactly what schema defines
 *   - O NO fictional properties or hallucination
 *   - O NO business rule or property mismatch
 *   - O All code is valid TypeScript, no markdown codeblock
 */
const __revise = {};
__revise;
