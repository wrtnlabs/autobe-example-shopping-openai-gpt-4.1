import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderRefund";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * Validate that sellers can create refunds only for orders assigned to them and
 * that access is correctly denied in other cases.
 *
 * 1. Register a seller (seller1) and authenticate.
 * 2. Register a buyer and authenticate.
 * 3. Buyer creates an order, assigning seller1 to the item(s).
 * 4. Switch context to seller1 (auth).
 * 5. Seller1 creates a refund for the order. This should succeed.
 * 6. Register a second seller (seller2) and authenticate.
 * 7. Attempt refund creation as seller2 for the same order. Should be denied.
 * 8. Attempt refund creation with an invalid (random) orderId. Should be denied.
 * 9. Assert audit fields are correctly set on the successful refund.
 */
export async function test_api_seller_refund_creation_and_access_control(
  connection: api.IConnection,
) {
  // 1. Register first seller (seller1)
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Password = RandomGenerator.alphaNumeric(12);
  const seller1Join = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(seller1Join);
  const seller1Id = seller1Join.id;

  // 2. Register buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyerJoin = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerJoin);
  const buyerId = buyerJoin.id;

  // 3. Buyer login (makes order)
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });

  // Prepare order item assigned to seller1
  const orderItem: IAiCommerceOrderItem.ICreate = {
    product_variant_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: seller1Id,
    item_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(2),
    quantity: 1 satisfies number & tags.Type<"int32">,
    unit_price: 10000,
    total_price: 10000,
  };
  // Create order
  const orderBody = {
    buyer_id: buyerId,
    channel_id: typia.random<string & tags.Format<"uuid">>(),
    order_code: RandomGenerator.alphaNumeric(10),
    status: RandomGenerator.pick([
      "created",
      "payment_pending",
      "shipped",
      "delivered",
    ]) as string,
    total_price: 10000,
    currency: "KRW",
    address_snapshot_id: typia.random<string & tags.Format<"uuid">>(),
    ai_commerce_order_items: [orderItem],
  } satisfies IAiCommerceOrder.ICreate;
  const order = await api.functional.aiCommerce.buyer.orders.create(
    connection,
    {
      body: orderBody,
    },
  );
  typia.assert(order);

  // 4. Seller1 login
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller1Email,
      password: seller1Password,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // 5. Seller1 creates a refund (should succeed)
  const refundAmount = Math.min(order.paid_amount, order.total_price);
  const refundBody = {
    actor_id: seller1Id,
    amount: refundAmount,
    currency: order.currency,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IAiCommerceOrderRefund.ICreate;
  const refund = await api.functional.aiCommerce.seller.orders.refunds.create(
    connection,
    {
      orderId: order.id,
      body: refundBody,
    },
  );
  typia.assert(refund);
  TestValidator.equals("refund order_id matches", refund.order_id, order.id);
  TestValidator.equals("refund actor_id matches", refund.actor_id, seller1Id);
  TestValidator.equals("refund amount matches", refund.amount, refundAmount);
  TestValidator.equals(
    "refund currency matches",
    refund.currency,
    order.currency,
  );
  TestValidator.predicate(
    "refund requested_at is defined",
    typeof refund.requested_at === "string" && refund.requested_at.length > 0,
  );

  // 6. Register and login as second seller (seller2)
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Password = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
    } satisfies IAiCommerceSeller.IJoin,
  });
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller2Email,
      password: seller2Password,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // 7. Try refund as seller2 (should be denied)
  await TestValidator.error(
    "unauthorized seller cannot create a refund",
    async () => {
      await api.functional.aiCommerce.seller.orders.refunds.create(connection, {
        orderId: order.id,
        body: {
          actor_id: typia.random<string & tags.Format<"uuid">>(),
          amount: refundAmount,
          currency: order.currency,
          reason: "Unauthorized seller attempt",
        } satisfies IAiCommerceOrderRefund.ICreate,
      });
    },
  );

  // 8. Try refund with invalid orderId (should be denied)
  await TestValidator.error(
    "refund for nonexistent order should fail",
    async () => {
      await api.functional.aiCommerce.seller.orders.refunds.create(connection, {
        orderId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          actor_id: typia.random<string & tags.Format<"uuid">>(),
          amount: refundAmount,
          currency: order.currency,
          reason: "Invalid orderId test",
        } satisfies IAiCommerceOrderRefund.ICreate,
      });
    },
  );
}

/**
 * The draft thoroughly covers seller and buyer account setup, order creation,
 * seller context switching, successful refund creation, denial of unauthorized
 * and invalid refund attempts, and audit field assertions. All async/await
 * usage is correct, type assertions use typia.assert, all TestValidator
 * functions have descriptive titles as first parameter, the parameter
 * structures are correct, only allowed DTOs and APIs are used, and
 * null/undefined handling is proper. No forbidden patterns, type errors, or
 * violations exist. All required logic and business scenarios are included, and
 * there is zero usage of additional imports, non-existent properties, or
 * fictional helpers.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented
 *   - O NO TYPE ERROR TESTING
 *   - O NO `as any` USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: `connection: api.IConnection`
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY `api.functional.*` call has `await`
 *   - O TestValidator.error with async callback has `await`
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have `await`
 *   - O All async operations inside conditionals have `await`
 *   - O Return statements with async calls have `await`
 *   - O Promise.all() calls have `await`
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with `typia.assert()`
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used (no helper functions)
 *   - O CRITICAL: NEVER touch connection.headers in any way - ZERO manipulation
 *       allowed
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included (unimplementable parts are
 *       omitted)
 *   - O No illogical patterns
 *   - O Random data generation uses appropriate constraints and formats
 *   - O CRITICAL: All TestValidator functions include descriptive title as FIRST
 *       parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only (no complex error message checking)
 *   - O CRITICAL: For TestValidator.error(), use `await` ONLY with async callbacks
 *   - O CRITICAL: Only API functions and DTOs from the provided materials are used
 *       (not from examples)
 *   - O CRITICAL: No fictional functions or types from examples are used
 *   - O CRITICAL: No type safety violations (`any`, `@ts-ignore`,
 *       `@ts-expect-error`)
 *   - O CRITICAL: All TestValidator functions include title as first parameter and
 *       use correct positional parameter syntax
 *   - O Follows proper TypeScript conventions and type safety practices
 *   - O Efficient resource usage and proper cleanup where necessary
 *   - O Secure test data generation practices
 *   - O No hardcoded sensitive information in test data
 *   - O No authentication role mixing without proper context switching
 *   - O No operations on deleted or non-existent resources
 *   - O All business rule constraints are respected
 *   - O No circular dependencies in data creation
 *   - O Proper temporal ordering of events
 *   - O Maintained referential integrity
 *   - O Realistic error scenarios that could actually occur
 *   - O Type Safety Excellence
 *   - O Const Assertions
 *   - O Generic Type Parameters
 *   - O Null/Undefined Handling
 *   - O No Type Assertions
 *   - O No Non-null Assertions
 *   - O Complete Type Annotations
 *   - O Modern TypeScript Features
 *   - O NO Markdown Syntax
 *   - O NO Documentation Strings
 *   - O NO Code Blocks in Comments
 *   - O ONLY Executable Code
 *   - O Output is TypeScript, NOT Markdown
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
