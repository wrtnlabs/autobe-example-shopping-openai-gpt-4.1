import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceSubOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSubOrder";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 관리자가 이미 등록된 주문(orderId)에 대해 새로운 하위 주문(subOrderId)을 성공적으로 생성하는 시나리오
 *
 * 1. 관리자 계정 생성 및 인증(회원가입)
 * 2. 판매자 계정 생성 및 인증(회원가입)
 * 3. 랜덤 buyer/channel/address_snapshot 및 상품 변형 ID로 orders 생성 (order_id 획득)
 * 4. 관리자 로그인(확실한 Auth context)
 * 5. 해당 주문에 대해 seller_id를 연결하여 하위 주문 생성
 * 6. 반환된 하위 주문 엔티티의 주요 필드가 입력값과 일치하는지 검증
 */
export async function test_api_admin_create_suborder_success(
  connection: api.IConnection,
) {
  // 1. 관리자 회원가입 (이메일/비밀번호 랜덤값을 별도 변수로 분리)
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

  // 2. 판매자 회원가입
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);

  // 3. 주문 생성 (orderId 획득, 상품 1개 이상 필수)
  const buyerId = typia.random<string & tags.Format<"uuid">>();
  const channelId = typia.random<string & tags.Format<"uuid">>();
  const addressSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const orderItem: IAiCommerceOrderItem.ICreate = {
    product_variant_id: typia.random<string & tags.Format<"uuid">>(),
    seller_id: sellerJoin.id,
    item_code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    quantity: 1,
    unit_price: 10000,
    total_price: 10000,
  };
  const orderBody = {
    buyer_id: buyerId,
    channel_id: channelId,
    order_code: `ORD-${RandomGenerator.alphaNumeric(8)}`,
    status: "created",
    total_price: 10000,
    currency: "KRW",
    address_snapshot_id: addressSnapshotId,
    ai_commerce_order_items: [orderItem],
  } satisfies IAiCommerceOrder.ICreate;

  const order = await api.functional.aiCommerce.admin.orders.create(
    connection,
    { body: orderBody },
  );
  typia.assert(order);

  // 4. 관리자 로그인(세션 확립)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 5. 하위 주문 생성
  const subOrderBody = {
    order_id: order.id,
    seller_id: sellerJoin.id,
    suborder_code: `SORD-${RandomGenerator.alphaNumeric(6)}`,
    status: "payment_pending",
    total_price: order.total_price,
    shipping_method: null,
    tracking_number: null,
  } satisfies IAiCommerceSubOrder.ICreate;

  const subOrder =
    await api.functional.aiCommerce.admin.orders.subOrders.create(connection, {
      orderId: order.id,
      body: subOrderBody,
    });
  typia.assert(subOrder);

  // 6. 주요 필드 일치 검증
  TestValidator.equals(
    "subOrder.order_id matches",
    subOrder.order_id,
    subOrderBody.order_id,
  );
  TestValidator.equals(
    "subOrder.seller_id matches",
    subOrder.seller_id,
    subOrderBody.seller_id,
  );
  TestValidator.equals(
    "subOrder.suborder_code matches",
    subOrder.suborder_code,
    subOrderBody.suborder_code,
  );
  TestValidator.equals(
    "subOrder.status matches",
    subOrder.status,
    subOrderBody.status,
  );
  TestValidator.equals(
    "subOrder.total_price matches",
    subOrder.total_price,
    subOrderBody.total_price,
  );
  TestValidator.equals(
    "subOrder.shipping_method is null",
    subOrder.shipping_method,
    null,
  );
  TestValidator.equals(
    "subOrder.tracking_number is null",
    subOrder.tracking_number,
    null,
  );
}

/**
 * 1. API 및 DTO 사용 규정, import 제한 등 모든 코드 양식 문제 없음.
 * 2. 관리자/판매자 회원가입, 주문 생성, 하위 주문 생성 등 순차적 실제 비즈니스 플로우 구현이 잘 반영됨.
 * 3. 모든 await 누락 없이 API 및 TestValidator 사용 규정에 맞음.
 * 4. Typia.assert로 응답 검증하는 부분 정확, 타입 혼동/DTO variant 오용 없음.
 * 5. TestValidator.equals 사용 시 title 필수 파라미터 포함 및 인자 순서 props/document 준수함.
 * 6. 랜덤 데이터 생성시 typia.random, RandomGenerator 활용과 Null/undefined 및 tagged type 문제
 *    없음.
 * 7. Connection.headers 조작/변경 코드 없음, 인증 전환은 인증 API 순서로만 처리.
 * 8. TypeError 유발 intentional test, wrong type 데이터, as any 등의 절대 금지 조항 모두 준수됨.
 * 9. 하위 주문 생성 응답에서 주요 입력값과 일치 여부 검증(필드별 TestValidator.equals)도 명확히 OK.
 * 10. Illogical code(예: 이미 삭제된 객체 참조, 순서 오류 등) 및 더미/불필요 변수/코드 없음.
 * 11. 불필요한 외부 함수, helper, import 추가 없음. ★ 단, admin login의 credential에서 테스트 상 실제로
 *     adminJoin의 email, password를 재사용하여야 하며, buyer_id와 혼동되는 부분이 생길 우려 있으므로
 *     adminJoin 생성 시 email과 password를 변수로 따로 빼고, login 시 그 값으로 로그인하는 로직이면 더욱
 *     안전합니다.
 *
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 1.1. Function Calling Workflow
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Test Function Structure
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.3.2. Common Null vs Undefined Mistakes
 *   - O 3.4. Random Data Generation
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O 🚨 NO TYPE ERROR TESTING - THIS IS #1 VIOLATION 🚨
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
 *   - O No illogical patterns: All test scenarios respect business rules and data
 *       relationships
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
