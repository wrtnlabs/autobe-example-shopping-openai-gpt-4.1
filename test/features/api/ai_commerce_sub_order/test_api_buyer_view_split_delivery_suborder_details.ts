import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAiCommerceSubOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSubOrder";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * E2E test for buyer's split delivery sub-order detail view and access control.
 *
 * This test covers:
 *
 * - Buyer is only able to access sub-orders for their own orders.
 * - Sub-order detail fields (status, tracking, pricing) are visible for owned
 *   sub-orders.
 * - Access by a buyer to a sub-order that belongs to another buyer is denied with
 *   error.
 *
 * Steps:
 *
 * 1. Register and login as a buyer
 * 2. Register and login as admin
 * 3. Buyer creates a new order (with at least one item)
 * 4. Admin splits the order into at least one sub-order
 * 5. Buyer reads the details of the sub-order and verifies correctness
 * 6. New buyer attempts (and fails) to access the sub-order (access control)
 */
export async function test_api_buyer_view_split_delivery_suborder_details(
  connection: api.IConnection,
) {
  // 1. Register and authenticate buyer
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyerJoinOutput = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerJoinOutput);

  // 2. Register and authenticate admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const adminJoinOutput = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoinOutput);

  // 3. Buyer places an order
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });
  const buyerId = buyerJoinOutput.id;
  // Order item set up with at least one valid item (simulate realistic data)
  const orderItem: IAiCommerceOrderItem.ICreate = {
    product_variant_id: typia.random<string & tags.Format<"uuid">>(),
    item_code: RandomGenerator.alphaNumeric(7),
    name: RandomGenerator.name(2),
    quantity: 1,
    unit_price: 5000,
    total_price: 5000,
  };
  const orderBody = {
    buyer_id: buyerId,
    channel_id: typia.random<string & tags.Format<"uuid">>(),
    order_code: RandomGenerator.alphaNumeric(8),
    status: "created",
    total_price: orderItem.total_price,
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

  // 4. Switch to admin for sub-order creation
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  // Simulate seller UUID for the sub-order (simulate only—seller join not in scenario scope)
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const subOrderICreate = {
    order_id: order.id,
    seller_id: sellerId,
    suborder_code: RandomGenerator.alphaNumeric(9),
    status: "payment_pending",
    total_price: order.total_price,
  } satisfies IAiCommerceSubOrder.ICreate;
  const subOrder =
    await api.functional.aiCommerce.admin.orders.subOrders.create(connection, {
      orderId: order.id,
      body: subOrderICreate,
    });
  typia.assert(subOrder);

  // 5. Switch back to buyer and read sub-order as owner
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });
  const result = await api.functional.aiCommerce.buyer.orders.subOrders.at(
    connection,
    {
      orderId: order.id,
      subOrderId: subOrder.id,
    },
  );
  typia.assert(result);
  // Assert core business info is correct
  TestValidator.equals("sub-order id matches", result.id, subOrder.id);
  TestValidator.equals(
    "belongs to the correct order",
    result.order_id,
    order.id,
  );
  TestValidator.equals("belongs to correct seller", result.seller_id, sellerId);
  TestValidator.equals(
    "total_price correct",
    result.total_price,
    subOrder.total_price,
  );
  TestValidator.equals("status matches", result.status, subOrder.status);
  // Test field presence as buyer
  TestValidator.predicate(
    "suborder_code is string",
    typeof result.suborder_code === "string",
  );
  TestValidator.predicate(
    "status is string",
    typeof result.status === "string",
  );

  // 6. Register another buyer and try to access the sub-order (should fail)
  const otherBuyerEmail = typia.random<string & tags.Format<"email">>();
  const otherBuyerPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.buyer.join(connection, {
    body: {
      email: otherBuyerEmail,
      password: otherBuyerPassword,
    } satisfies IBuyer.ICreate,
  });
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: otherBuyerEmail,
      password: otherBuyerPassword,
    } satisfies IBuyer.ILogin,
  });
  await TestValidator.error(
    "buyer cannot access another buyer's sub-order",
    async () => {
      await api.functional.aiCommerce.buyer.orders.subOrders.at(connection, {
        orderId: order.id,
        subOrderId: subOrder.id,
      });
    },
  );
}

/**
 * Review of the draft code:
 *
 * 1. Test follows a logical multi-actor scenario. All role switches (buyer, admin,
 *    other buyer) are performed with the proper login endpoint, and tokens are
 *    managed by SDK as required.
 * 2. Credentials are generated as random, and business-relevant values are
 *    provided for all DTOs using the correct types (ICreate variants).
 * 3. All API function calls use await. Every test assertion with TestValidator
 *    includes a descriptive title as the first argument.
 * 4. The test of a buyer reading a suborder they own covers positive assertions
 *    (correct fields mapped, data matches what the admin created) and field
 *    presence (status, code). Negative test properly checks that another buyer
 *    cannot access the suborder, using TestValidator.error with await and an
 *    async function (no type errors, no type mismatches, no forbidden
 *    scenarios).
 * 5. No additional imports added; template-only imports are used. No mutation of
 *    connection.headers.
 * 6. Typia.assert() is used for all API responses. All DTO variants match the
 *    endpoint usage.
 * 7. There are no attempts to test HTTP status codes or error message internals;
 *    only error existence by business logic.
 * 8. No hacked types, as any, or wrong requests – types always match the expected
 *    signatures.
 * 9. No tests for missing required fields or type validation. No checks for
 *    properties not in the DTO. No illogical code (no deletion on empty
 *    objects, etc.).
 * 10. All RandomGenerator and typia.random usage is with explicit type argument and
 *     appropriate tag patterns or as constraints.
 * 11. Documentation and comments are clear.
 *
 * No prohibited patterns or type errors, no forbidden API usage, and the
 * scenario is fully implementable. No prohibited markdown syntax. Draft is
 * production-ready.
 *
 * No changes are needed in the final versus the draft; the draft meets all
 * requirements and quality checks.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.4. Random Data Generation
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O All TestValidator functions include descriptive title as first parameter
 *   - O Function follows correct naming convention and parameter list
 *   - O API function calls match provided SDK
 */
const __revise = {};
__revise;
