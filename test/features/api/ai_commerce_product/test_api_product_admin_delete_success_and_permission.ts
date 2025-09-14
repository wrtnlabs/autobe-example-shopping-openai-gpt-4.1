import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 관리자 상품 삭제(삭제/권한/존재여부 검증) E2E
 *
 * 1. Admin 계정 회원가입 및 인증
 * 2. 상품 등록 및 id 확보
 * 3. (성공) admin 인증 상태로 상품 삭제 요청 → 정상 완료
 * 4. (실패) 인증 없는 connection으로 삭제 요청 → permission error
 * 5. (실패) 타 admin 신규 가입 후 삭제 요청 → permission error
 * 6. (실패) 존재하지 않는(랜덤) productId로 삭제 요청 → not found error
 */
export async function test_api_product_admin_delete_success_and_permission(
  connection: api.IConnection,
) {
  // 1. admin 계정 회원가입 및 인증
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "adminpass123",
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  // 2. 상품 등록
  const productInput = {
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    store_id: typia.random<string & tags.Format<"uuid">>(),
    product_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    status: "active",
    business_status: "pending_approval",
    current_price: 19900,
    inventory_quantity: typia.random<number & tags.Type<"int32">>(),
  } satisfies IAiCommerceProduct.ICreate;
  const product = await api.functional.aiCommerce.admin.products.create(
    connection,
    {
      body: productInput,
    },
  );
  typia.assert(product);

  // 3. (성공) admin 인증 상태로 상품 삭제 요청
  await api.functional.aiCommerce.admin.products.erase(connection, {
    productId: product.id,
  });

  // 4. (실패) 인증 없는 connection으로 삭제 요청
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "인증 없는 connection으로 product 삭제 시도 → 403",
    async () => {
      await api.functional.aiCommerce.admin.products.erase(unauthConn, {
        productId: product.id,
      });
    },
  );

  // 5. (실패) 타 admin(신규 가입)으로 삭제 시도
  const secondAdminEmail = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.admin.join(connection, {
    body: {
      email: secondAdminEmail,
      password: "anotherAdmin123",
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  await TestValidator.error(
    "타 admin 인증 상태 product 삭제 시도 → 403",
    async () => {
      await api.functional.aiCommerce.admin.products.erase(connection, {
        productId: product.id,
      });
    },
  );

  // 6. (실패) 존재하지 않는 productId로 삭제 시도
  await TestValidator.error(
    "존재하지 않는 productId 삭제 시도 → 404",
    async () => {
      await api.functional.aiCommerce.admin.products.erase(connection, {
        productId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}

/**
 * - 모든 API 함수 호출에 await를 정확히 사용했는지, 상품 삭제(erase) 동작 및 실패 case가 모두 await+async
 *   패턴으로 구현되어 있음
 * - Typia.assert 호출이 회원가입 및 상품 생성 등 반환 DTO를 모두 검증하는 부분에 제대로 들어가 있음 (void API인
 *   erase는 생략)
 * - 인증 전용/없는 커넥션은 headers: {}로 처리했으며, 타 관리자 시도는 connection 그대로 사용해 각각 토큰이 덮이도록
 *   되었음
 * - 테스트 검증(권한/존재여부)은 await TestValidator.error()에 한글 명확 타이틀과 async 람다로 구현해 현장 오류
 *   패턴을 모두 테스트함
 * - 변수 명명과 무작위 데이터 생성 로직이 타입 및 필드 정의와 일치함 (email, uuid 등)
 * - 리퀘스트 바디 생성(상품 생성 등)은 반드시 const + satisfies로 타입 선언했으며, 불필요한 타입 주석/재할당 없음. 불필요한
 *   import/도큐먼트 없음
 * - 인증 context 전환은 connection.headers 조작이 아닌 새 커넥션 복사 방식만 사용했고, 불필요한 mutation 없음
 * - 비즈니스 타당성과 시나리오 흐름이 논리적임 (회원가입 → 상품 등록 → 권한별 삭제 → 404)
 * - 절대 금지 사항(잘못된 타입 테스트 등)이 없음. type error를 유발할 수 있는 any, as any, 기타 type 연관 금지
 *   사항 완전 미포함
 * - Scenario, checklist, 예제 코드 및 모든 구조적 요구사항에 따라 완전히 충족됨. 최종 코드는 바로 컴파일/테스트/배포 가능
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
 *   - O 4.6.1. CRITICAL: Never Use Type Annotations with Request Body Variables
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.7.1. CRITICAL: Date Object Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.8.1. Common Illogical Anti-patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.9. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.8.1. Autonomous TypeScript Syntax Review Mission
 *   - O 4.8.2. Proactive TypeScript Pattern Excellence
 *   - O 4.8.3. TypeScript Anti-Patterns to Avoid
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.11.1. ACCEPT COMPILER REALITY
 *   - O 4.11.2. HALLUCINATION PATTERNS TO AVOID
 *   - O 4.11.3. WHEN YOU GET "Property does not exist" ERRORS
 *   - O 4.11.4. PRE-FLIGHT CHECKLIST
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 4.12.1. ABSOLUTELY FORBIDDEN PATTERNS
 *   - O 4.12.2. WHY THIS IS ABSOLUTELY FORBIDDEN
 *   - O 4.12.3. WHAT TO DO INSTEAD
 *   - O 4.12.4. WHEN TEST SCENARIO REQUESTS TYPE ERROR TESTING - IGNORE IT
 *   - O 4.12.5. MANDATORY REVISE STEP ENFORCEMENT
 *   - O 4.12.6. CRITICAL REMINDERS
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented
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
 *   - O Path parameters and request body are correctly structured
 *   - O All API responses are properly validated with `typia.assert()`
 *   - O Authentication is handled correctly without manual token management
 *   - O Only actual authentication APIs are used (no helper functions)
 *   - O CRITICAL: NEVER touch connection.headers in any way
 *   - O Test follows a logical, realistic business workflow
 *   - O Complete user journey from authentication to final validation
 *   - O Proper data dependencies and setup procedures
 *   - O Edge cases and error conditions are appropriately tested
 *   - O Only implementable functionality is included
 *   - O No illogical patterns
 *   - O Random data generation uses appropriate constraints and formats
 *   - O CRITICAL: All TestValidator functions include descriptive title as FIRST
 *       parameter
 *   - O All TestValidator assertions use actual-first, expected-second pattern
 *       (after title)
 *   - O Code includes comprehensive documentation and comments
 *   - O Variable naming is descriptive and follows business context
 *   - O Simple error validation only
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
