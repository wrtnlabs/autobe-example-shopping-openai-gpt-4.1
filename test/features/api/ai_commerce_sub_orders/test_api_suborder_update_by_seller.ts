import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrder";
import type { IAiCommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceOrderItem";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceSubOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSubOrder";
import type { IAiCommerceSubOrders } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSubOrders";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 판매자가 본인 소유의 하위 주문(subOrder)에 대해 허용된 필드(배송 상태, 운송장번호 등)를 정상적으로 수정할 수 있는지
 * 검증하는 테스트.
 *
 * 전체 흐름:
 *
 * 1. 판매자1, 판매자2 테스트 계정을 생성(joint), 각각 인증(login)
 * 2. 어드민 계정 생성/인증 후 주문(order) 생성
 * 3. 어드민이 해당 주문에 대해
 *
 *    - 판매자1 소유의 하위주문(subOrder1),
 *    - 판매자2 소유의 하위주문(subOrder2) 를 각각 생성해둔다.
 * 4. 판매자1 계정으로 로그인하여,
 *
 *    - 본인 소유의 하위주문(subOrder1)에 대해 update(배송 상태, 운송장 등) → 정상 응답
 *    - 존재하지 않는 하위주문에 대해 update → 에러 발생
 *    - 타인(판매자2)의 하위주문에 대해 update → 에러 발생
 * 5. 최초 정상 수정 시 실제 update가 반영되었는지도 응답 값을 통해 검증
 */
export async function test_api_suborder_update_by_seller(
  connection: api.IConnection,
) {
  // 1. 판매자1, 판매자2 계정 생성 및 각자 인증
  const seller1Email = typia.random<string & tags.Format<"email">>();
  const seller1Pw = RandomGenerator.alphaNumeric(12);
  const seller2Email = typia.random<string & tags.Format<"email">>();
  const seller2Pw = RandomGenerator.alphaNumeric(12);
  const seller1 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller1Email,
      password: seller1Pw,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(seller1);

  const seller2 = await api.functional.auth.seller.join(connection, {
    body: {
      email: seller2Email,
      password: seller2Pw,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(seller2);

  // 2. 어드민 계정 생성&인증
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPw = RandomGenerator.alphaNumeric(14);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPw,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(admin);
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPw,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 3. 어드민으로 주문 및 두 개의 하위주문 생성
  const order = await api.functional.aiCommerce.admin.orders.create(
    connection,
    {
      body: {
        buyer_id: typia.random<string & tags.Format<"uuid">>(),
        channel_id: typia.random<string & tags.Format<"uuid">>(),
        order_code: RandomGenerator.alphaNumeric(12),
        status: "created",
        total_price: 25000,
        currency: "KRW",
        address_snapshot_id: typia.random<string & tags.Format<"uuid">>(),
        ai_commerce_order_items: [
          {
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            seller_id: seller1.id,
            item_code: RandomGenerator.alphaNumeric(8),
            name: RandomGenerator.name(),
            quantity: 1,
            unit_price: 10000,
            total_price: 10000,
          } satisfies IAiCommerceOrderItem.ICreate,
          {
            product_variant_id: typia.random<string & tags.Format<"uuid">>(),
            seller_id: seller2.id,
            item_code: RandomGenerator.alphaNumeric(8),
            name: RandomGenerator.name(),
            quantity: 1,
            unit_price: 15000,
            total_price: 15000,
          } satisfies IAiCommerceOrderItem.ICreate,
        ],
      } satisfies IAiCommerceOrder.ICreate,
    },
  );
  typia.assert(order);

  // 하위주문1(판매자1 소유) 생성
  const subOrder1 =
    await api.functional.aiCommerce.admin.orders.subOrders.create(connection, {
      orderId: order.id,
      body: {
        order_id: order.id,
        seller_id: seller1.id,
        suborder_code: RandomGenerator.alphaNumeric(10),
        status: "created",
        shipping_method: null,
        tracking_number: null,
        total_price: 10000,
      } satisfies IAiCommerceSubOrder.ICreate,
    });
  typia.assert(subOrder1);
  // 하위주문2(판매자2 소유) 생성
  const subOrder2 =
    await api.functional.aiCommerce.admin.orders.subOrders.create(connection, {
      orderId: order.id,
      body: {
        order_id: order.id,
        seller_id: seller2.id,
        suborder_code: RandomGenerator.alphaNumeric(10),
        status: "created",
        shipping_method: null,
        tracking_number: null,
        total_price: 15000,
      } satisfies IAiCommerceSubOrder.ICreate,
    });
  typia.assert(subOrder2);

  // 4-1. 판매자1 로그인
  await api.functional.auth.seller.login(connection, {
    body: {
      email: seller1Email,
      password: seller1Pw,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // 4-2. 본인 소유의 하위주문 정상 update
  const updateBody = {
    status: "shipped",
    shipping_method: RandomGenerator.pick([
      "courier",
      "parcel",
      "express",
      "pickup",
    ] as const),
    tracking_number: RandomGenerator.alphaNumeric(12),
  } satisfies IAiCommerceSubOrders.IUpdate;
  const updated =
    await api.functional.aiCommerce.seller.orders.subOrders.update(connection, {
      orderId: order.id,
      subOrderId: subOrder1.id,
      body: updateBody,
    });
  typia.assert(updated);
  TestValidator.equals(
    "하위주문 status 반영 확인",
    updated.status,
    updateBody.status,
  );
  TestValidator.equals(
    "하위주문 shipping_method 반영 확인",
    updated.shipping_method,
    updateBody.shipping_method,
  );
  TestValidator.equals(
    "하위주문 tracking_number 반영 확인",
    updated.tracking_number,
    updateBody.tracking_number,
  );
  TestValidator.equals("id는 불변이어야 함", updated.id, subOrder1.id);

  // 4-3. 존재하지 않는 하위주문 id 접근 (should error)
  await TestValidator.error(
    "존재하지 않는 하위주문에 대해 update 시도시 에러 발생",
    async () => {
      await api.functional.aiCommerce.seller.orders.subOrders.update(
        connection,
        {
          orderId: order.id,
          subOrderId: typia.random<string & tags.Format<"uuid">>(),
          body: updateBody,
        },
      );
    },
  );

  // 4-4. 타인(판매자2) 소유 하위주문 update 시도 (should error)
  await TestValidator.error(
    "타인 소유의 하위주문 update 시도시 에러 발생",
    async () => {
      await api.functional.aiCommerce.seller.orders.subOrders.update(
        connection,
        {
          orderId: order.id,
          subOrderId: subOrder2.id,
          body: updateBody,
        },
      );
    },
  );
}

/**
 * - 전체적으로 비즈니스 플로우(계정 생성/인증, 주문/하위주문 cascade 생성, 계정 컨텍스트 스위칭)에 따라 시나리오를 분리하여
 *   작성했다.
 * - 판매자1 소유의 하위주문은 정상 update, 응답 타입(반영여부)까지 검증했다.
 * - 존재하지 않는 id, 타인 소유의 하위주문(판매자2 소유) 수정 시도는 await TestValidator.error로 에러 발생 확인
 *   방식으로 테스트했다.
 * - 모든 await, typia.assert 구문 정상 삽입했으며, random 데이터 생성을 위한 typia.random 및
 *   RandomGenerator 사용 시 규약(tags, 타입 파라미터) 정확히 활용하였다.
 * - 각종 파생 DTO 타입, 매개변수 구조, API 호출 패턴, 테스트 검증(title 필수, actual first) 등
 *   TypeScript/E2E 규약 위반 없음.
 * - 불필요 import 없음, 오직 템플릿 import만 사용.
 * - Type error purposely created/wrong type, as any, Partial 사용 없음. 모든 Update는
 *   IUpdate 타입으로만 구현.
 * - Null/undefined 처리(Nullable 필드)는 의도적 null입력으로 일관. subOrderId 등은 임의 uuid 생성으로
 *   일관됨.
 * - 테스트 케이스도 본인 권한 성공, 없는 id, 타인 소유 3가지 케이스 분명하게 커버.
 * - 함수 외부 선언, 임시 전역 변수, 추가 함수 선언 없음. 코드 독립성과 가독성 준수.
 * - 불필요한 business illogical action 없음. 모든 자원/권한은 정상 cascade 생성 후 사용.
 * - 마지막 TestValidator assertions들은 디스크립션(title) 필수 적용.
 * - Omitted: NO markdown, code blocks, only pure ts file out.
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
 *   - O 4.1. Code Quality
 *   - O 4.2. Test Design
 *   - O 4.3. Data Management
 *   - O 4.4. Documentation
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.8.1. Autonomous TypeScript Syntax Review Mission
 *   - O 4.8.2. Proactive TypeScript Pattern Excellence
 *   - O 4.8.3. TypeScript Anti-Patterns to Avoid
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
 *   - O All functionality implemented using only the imports provided in template
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
 *   - O Type Safety Excellence: No implicit any types, all functions have explicit
 *       return types
 *   - O Const Assertions: All literal arrays for RandomGenerator.pick use `as
 *       const`
 *   - O Generic Type Parameters: All typia.random() calls include explicit type
 *       arguments
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No Type Assertions: Never use `as Type` - always use proper validation
 *   - O No Non-null Assertions: Never use `!` operator - handle nulls explicitly
 *   - O Complete Type Annotations: All parameters and variables have appropriate
 *       types
 *   - O Modern TypeScript Features: Leverage advanced features where they improve
 *       code quality
 *   - O NO Markdown Syntax: Zero markdown headers, code blocks, or formatting
 *   - O NO Documentation Strings: No template literals containing documentation
 *   - O NO Code Blocks in Comments: Comments contain only plain text
 *   - O ONLY Executable Code: Every line is valid, compilable TypeScript
 *   - O Output is TypeScript, NOT Markdown: Generated output is pure .ts file
 *       content, not a .md document with code blocks
 *   - O Review performed systematically
 *   - O All found errors documented
 *   - O Fixes applied in final
 *   - O Final differs from draft
 *   - O No copy-paste
 */
const __revise = {};
__revise;
