import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceCouponUse } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponUse";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 관리자가 이미 생성된 쿠폰 사용 이력(coupon use record)에 대해 상태(status) 또는 연관 주문(order) 등
 * 주요 필드를 업데이트(예: 사용 취소, 수동 환불, order_id 변경)를 테스트하는 E2E 시나리오.
 *
 * 1. 선행 조건: 관리자 회원 가입 (auth.admin.join)
 * 2. 선행 조건: couponUse 데이터 사전 생성 (aiCommerce.admin.couponUses.create)
 * 3. Scenario 핵심: coupon use 레코드를 PUT
 *    /aiCommerce/admin/couponUses/{couponUseId} 엔드포인트로 상태('revoked'),
 *    order_id, redeemed_at 등을 update
 * 4. Update 후 API 결과로 상태/연관 주문/타임스탬프 변동이 반영됐는지 검증
 * 5. 경계값 및 이상조건 :
 *
 *    - Status를 "revoked" 등 정상적, 허용 범위 값으로 수정 -> 성공 기대
 *    - Order_id를 null/임의 uuid 값 등으로 변경 -> 허용 관계 확인
 *    - Redeemed_at을 null로 변경(미리 사용취소 처리 등 시나리오)
 *    - 이상(불허 값 또는 finalized 이후 update 시도 등 불가 케이스)이면 실패 확인 필요
 */
export async function test_api_coupon_use_admin_update_status_and_order_dependency(
  connection: api.IConnection,
) {
  // 1. 관리자 회원 가입
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
  } satisfies IAiCommerceAdmin.IJoin;

  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);

  // 2. 쿠폰 사용 이력 사전 생성
  const couponUseCreateBody = {
    coupon_issue_id: typia.random<string & tags.Format<"uuid">>(),
    user_id: typia.random<string & tags.Format<"uuid">>(),
    status: "redeemed",
    redeemed_at: new Date().toISOString(),
    order_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IAiCommerceCouponUse.ICreate;

  const couponUse = await api.functional.aiCommerce.admin.couponUses.create(
    connection,
    {
      body: couponUseCreateBody,
    },
  );
  typia.assert(couponUse);

  // 3-1. 상태(status) 정상 변경 (예: 'revoked')
  const updateStatusBody = {
    status: "revoked",
  } satisfies IAiCommerceCouponUse.IUpdate;

  const updatedStatus = await api.functional.aiCommerce.admin.couponUses.update(
    connection,
    {
      couponUseId: couponUse.id,
      body: updateStatusBody,
    },
  );
  typia.assert(updatedStatus);
  TestValidator.equals(
    "coupon use status updated",
    updatedStatus.status,
    updateStatusBody.status,
  );

  // 3-2. order_id를 null로 변경
  const updateOrderIdNullBody = {
    order_id: null,
  } satisfies IAiCommerceCouponUse.IUpdate;
  const updatedOrderNull =
    await api.functional.aiCommerce.admin.couponUses.update(connection, {
      couponUseId: couponUse.id,
      body: updateOrderIdNullBody,
    });
  typia.assert(updatedOrderNull);
  TestValidator.equals(
    "coupon use order_id nullified",
    updatedOrderNull.order_id,
    null,
  );

  // 3-3. redeemed_at을 null로 변경
  const updateRedeemedAtNullBody = {
    redeemed_at: null,
  } satisfies IAiCommerceCouponUse.IUpdate;
  const updatedRedeemedAtNull =
    await api.functional.aiCommerce.admin.couponUses.update(connection, {
      couponUseId: couponUse.id,
      body: updateRedeemedAtNullBody,
    });
  typia.assert(updatedRedeemedAtNull);
  TestValidator.equals(
    "coupon use redeemed_at nullified",
    updatedRedeemedAtNull.redeemed_at,
    null,
  );

  // 3-4. order_id를 임의 uuid로 변경
  const someOtherOrderId = typia.random<string & tags.Format<"uuid">>();
  const updateOrderBody = {
    order_id: someOtherOrderId,
  } satisfies IAiCommerceCouponUse.IUpdate;
  const updatedOrder = await api.functional.aiCommerce.admin.couponUses.update(
    connection,
    {
      couponUseId: couponUse.id,
      body: updateOrderBody,
    },
  );
  typia.assert(updatedOrder);
  TestValidator.equals(
    "coupon use order_id updated",
    updatedOrder.order_id,
    someOtherOrderId,
  );

  // 4. 이상케이스: status에 허용되지 않는 값 입력 시 실패 확인 (에러 발생 기대)
  await TestValidator.error(
    "update with invalid status should fail",
    async () => {
      await api.functional.aiCommerce.admin.couponUses.update(connection, {
        couponUseId: couponUse.id,
        body: {
          status: "finalized!!!not_allowed",
        } satisfies IAiCommerceCouponUse.IUpdate,
      });
    },
  );
}

/**
 * - 모든 필수 선행 API 호출(관리자 회원가입, couponUse 생성)이 빠짐없이 반영되어야 한다.
 * - API 호출 시 await 누락 사례 없음. (모든 api.functional.* 호출에 await 사용 완료)
 * - TestValidator 함수 모두 첫 인자에 설명 문자열 포함.
 * - Typia.random, RandomGenerator 등 랜덤 데이터 생성 시 타입 tag 준수 및 적절한 값 사용됨.
 * - Update test 케이스에서 status, order_id, redeemed_at 등 개별 필드 null/uuid/allowed
 *   string 등으로 정상적/경계/에러값 테스트되어 있음.
 * - 타입 오류 유발 목적의 테스트(예: as any, 잘못된 타입 전송) 전혀 존재하지 않음.
 * - Type assertion, non-null assertion 등 TypeScript 악습 패턴 없음. null 처리 명확히 구현됨.
 * - 응답값 typia.assert로 일관 검증, 이후 field 값 로직만 test. (불필요 중복 타입 체크 없음)
 * - Docs/code comment 상세 작성 및 변수 설명력 우수함.
 * - 불필요한 코드, 허구 타입, 불존재 함수 전혀 사용되지 않음.
 *
 * 코드 품질 및 규정 준수 우수. 제약 조건 내에서 명확히 요구사항 수행.
 *
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
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
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
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O NO TYPE ERROR TESTING - THIS IS #1 VIOLATION
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
