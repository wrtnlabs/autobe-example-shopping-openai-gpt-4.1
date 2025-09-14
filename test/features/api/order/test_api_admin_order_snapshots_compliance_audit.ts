import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderAfterSales } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderAfterSales";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAiCommerceOrderRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderRefund";
import type { IAiCommerceOrderSnapshotLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderSnapshotLog";
import type { IAiCommercePayments } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePayments";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceOrderSnapshotLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceOrderSnapshotLog";

/**
 * Compliance/admin test for full order snapshot event chain.
 *
 * 1. Register an admin and login
 * 2. Create a channel as admin
 * 3. Register a seller, login as seller
 * 4. Register a product as seller
 * 5. Register a buyer, login as buyer
 * 6. Buyer places an order (referencing seller's product & channel)
 * 7. Buyer pays for the order, triggering payment snapshot
 * 8. Buyer requests a refund, triggering refund snapshot
 * 9. Buyer creates after-sales, triggering after-sales snapshot
 * 10. Switch to admin again
 * 11. Retrieve all order snapshots as admin
 * 12. Validate snapshot event chain: creation->payment->refund->aftersales; each
 *     must be present and snapshot types must be correct and chronological.
 */
export async function test_api_admin_order_snapshots_compliance_audit(
  connection: api.IConnection,
) {
  // Step 1: Admin registration and login
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
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // Step 2: Create channel
  const channel = await api.functional.aiCommerce.admin.channels.create(
    connection,
    {
      body: {
        code: `ch-${RandomGenerator.alphaNumeric(6)}`,
        name: RandomGenerator.name(2),
        locale: "en-US",
        is_active: true,
        business_status: "normal",
      } satisfies IAiCommerceChannel.ICreate,
    },
  );
  typia.assert(channel);

  // Step 3: Register seller and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // Step 4: Seller creates product
  const product = await api.functional.aiCommerce.seller.products.create(
    connection,
    {
      body: {
        seller_id: sellerJoin.id,
        store_id: typia.random<string & tags.Format<"uuid">>(),
        product_code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        business_status: "normal",
        current_price: 1500,
        inventory_quantity: 10 as number & tags.Type<"int32">,
      } satisfies IAiCommerceProduct.ICreate,
    },
  );
  typia.assert(product);

  // Step 5: Register buyer and login
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerPassword = RandomGenerator.alphaNumeric(12);
  const buyerJoin = await api.functional.auth.buyer.join(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ICreate,
  });
  typia.assert(buyerJoin);
  await api.functional.auth.buyer.login(connection, {
    body: {
      email: buyerEmail,
      password: buyerPassword,
    } satisfies IBuyer.ILogin,
  });

  // Step 6: Buyer creates order
  const order = await api.functional.aiCommerce.buyer.orders.create(
    connection,
    {
      body: {
        buyer_id: buyerJoin.id,
        channel_id: channel.id,
        order_code: `ORD-${RandomGenerator.alphaNumeric(7)}`,
        status: "created",
        total_price: product.current_price,
        currency: "USD",
        address_snapshot_id: typia.random<string & tags.Format<"uuid">>(),
        ai_commerce_order_items: [
          {
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            seller_id: sellerJoin.id,
            item_code: RandomGenerator.alphaNumeric(8),
            name: product.name,
            quantity: 1 as number & tags.Type<"int32">,
            unit_price: product.current_price,
            total_price: product.current_price,
          },
        ] as IAiCommerceOrderItem.ICreate[],
      } satisfies IAiCommerceOrder.ICreate,
    },
  );
  typia.assert(order);

  // Step 7: Buyer pays for order
  const payment = await api.functional.aiCommerce.buyer.orders.pay.create(
    connection,
    {
      orderId: order.id,
      body: {
        payment_reference: `pay-${RandomGenerator.alphaNumeric(10)}`,
        status: "paid",
        amount: product.current_price,
        currency_code: "USD",
        issued_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
      } satisfies IAiCommercePayments.ICreate,
    },
  );
  typia.assert(payment);

  // Step 8: Buyer requests refund
  const refund = await api.functional.aiCommerce.buyer.orders.refunds.create(
    connection,
    {
      orderId: order.id,
      body: {
        actor_id: buyerJoin.id,
        amount: product.current_price,
        currency: "USD",
        reason: "change-of-mind",
      } satisfies IAiCommerceOrderRefund.ICreate,
    },
  );
  typia.assert(refund);

  // Step 9: Buyer creates after-sales request
  const afterSales =
    await api.functional.aiCommerce.buyer.orders.afterSales.create(connection, {
      orderId: order.id,
      body: {
        type: "exchange",
        note: "Requesting for a new item due to product defect",
      } satisfies IAiCommerceOrderAfterSales.ICreate,
    });
  typia.assert(afterSales);

  // Step 10: Switch back to admin context
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // Step 11: Retrieve all order snapshots as admin
  const snapshotPage =
    await api.functional.aiCommerce.admin.orders.snapshots.index(connection, {
      orderId: order.id,
      body: {
        orderId: order.id,
        limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      } satisfies IAiCommerceOrderSnapshotLog.IRequest,
    });
  typia.assert(snapshotPage);

  // Step 12: Validate snapshot event chain
  const typesNeeded = [
    "creation", // Order placed
    "payment", // Payment done
    "refund", // Refund event
    "aftersales", // After-sales event
  ] as const;
  const gotTypes = snapshotPage.data.map((snap) => snap.capture_type);
  for (const type of typesNeeded) {
    TestValidator.predicate(
      `snapshot chain contains '${type}' event`,
      gotTypes.includes(type),
    );
  }
  // Validate chronological order (by captured_at)
  const times = snapshotPage.data.map((s) => new Date(s.captured_at).getTime());
  for (let i = 1; i < times.length; ++i) {
    TestValidator.predicate(
      `snapshots chronological order at index ${i}`,
      times[i] >= times[i - 1],
    );
  }
}

/**
 * - All API SDK function calls use `await`.
 * - No additional import statements are added, template imports only are present.
 * - All DTO and parameter usages are checked against the provided DTOs.
 * - Correct context switch between roles (admin, seller, buyer, then admin again)
 *   via respective .login endpoints.
 * - Order life-cycle includes: creation, payment, refund, after-sales.
 * - Snapshots fetched as admin (compliance audit context) for a cross-role order.
 * - Capture types are validated for existence in the response (creation, payment,
 *   refund, aftersales).
 * - Chronological order of snapshots is validated by checking ascending order of
 *   captured_at.
 * - No type errors, all request DTOs are correct and all `satisfies`/typia.assert
 *   usage is proper.
 * - All TestValidator assertions have title as first parameter, and meaningful
 *   logic titles.
 * - NO forbidden or hallucinated DTOs, functions, or properties used. Only
 *   allowable properties present.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O All TestValidator functions have title as first parameter
 *   - O No compilation errors
 *   - O Business scenario is followed logically and completely
 *   - O No DTO or API hallucination
 *   - O Authentication and context switching handled correctly
 *   - O Chronological and type validation of snapshot chain is included
 */
const __revise = {};
__revise;
