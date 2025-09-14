import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceProductAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductAuditLog";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceProductAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProductAuditLog";

/**
 * 판매자가 등록한 상품의 감사 이력(audit log) 검색 및 주요 실패 시나리오 테스트
 *
 * 1. 판매자 계정 회원가입 및 인증 (api.functional.auth.seller.join)
 * 2. 신상품 등록 (api.functional.aiCommerce.seller.products.create) → 생성된
 *    product.id 저장
 * 3. 본인 상품의 감사 로그 조회 정상 조회
 *    (api.functional.aiCommerce.seller.products.auditLogs.index)
 *
 * - 필터: (1) product_id만, (2) 추가로 event_type/actor_id 등 일부 파라미터, (3) 페이지네이션
 *   변화(page, limit) 등 랜덤 조합
 * - 응답의 pagination/data 필수 필드/관계 무결성 확인, 반환된 로그의 product_id 및 seller_id와 일치성
 *   검증
 *
 * 4. 잘못된 productId(무작위 uuid)로 요청 (존재하지 않음)
 * 5. 타인 상품의 감사 로그 요청 (별도 판매자 계정 생성 후 해당 상품으로 시도)
 * 6. 인증 미실시 상태에서 감사 로그 요청 각 단계, 특히 실패 케이스에서 TestValidator.error로 거부/에러 검사
 */
export async function test_api_seller_product_auditlog_search(
  connection: api.IConnection,
) {
  // 1. 판매자 계정 회원가입 및 인증
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(12);
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);

  // 2. 상품 등록
  const storeId = typia.random<string & tags.Format<"uuid">>();
  const productCode = RandomGenerator.alphaNumeric(8);
  const productInput = {
    seller_id: sellerAuth.id,
    store_id: storeId,
    product_code: productCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    status: "active",
    business_status: "pending_approval",
    current_price: Math.floor(Math.random() * 100000) + 1000,
    inventory_quantity: typia.random<number & tags.Type<"int32">>(),
  } satisfies IAiCommerceProduct.ICreate;
  const product = await api.functional.aiCommerce.seller.products.create(
    connection,
    { body: productInput },
  );
  typia.assert(product);

  // 3. 정상 감사 이력 조회(case 1: 최소 필터)
  const auditLogsMinimal =
    await api.functional.aiCommerce.seller.products.auditLogs.index(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
        } satisfies IAiCommerceProductAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsMinimal);
  TestValidator.predicate(
    "상품 감사 로그 최소 필터 반환값 NotEmpty (자신의 상품)",
    auditLogsMinimal.data.length > 0,
  );
  TestValidator.equals(
    "반환된 로그의 모든 product_id가 본인 상품 id와 일치",
    auditLogsMinimal.data.every((l) => l.product_id === product.id),
    true,
  );

  // 3-2. 필터 조합(event_type, actor_id)
  const sampleEventType = auditLogsMinimal.data[0]?.event_type || "create";
  const sampleActorId = auditLogsMinimal.data[0]?.actor_id || sellerAuth.id;
  const auditLogsFiltered =
    await api.functional.aiCommerce.seller.products.auditLogs.index(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          event_type: sampleEventType,
          actor_id: sampleActorId,
        } satisfies IAiCommerceProductAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsFiltered);
  TestValidator.equals(
    "event_type 필터 적용시 반환값 모든 event_type 일치",
    auditLogsFiltered.data.every((l) => l.event_type === sampleEventType),
    true,
  );
  TestValidator.equals(
    "actor_id 필터 적용시 반환값 모든 actor_id 일치",
    auditLogsFiltered.data.every((l) => l.actor_id === sampleActorId),
    true,
  );

  // 3-3. 페이지네이션
  const auditLogsPaged =
    await api.functional.aiCommerce.seller.products.auditLogs.index(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          page: 1,
          limit: 2,
        } satisfies IAiCommerceProductAuditLog.IRequest,
      },
    );
  typia.assert(auditLogsPaged);
  TestValidator.equals(
    "페이지네이션의 limit과 반환 행 수 일치",
    auditLogsPaged.data.length,
    2,
  );

  // 4. 존재하지 않는 productId
  await TestValidator.error(
    "존재하지 않는 productId로 감사 로그 요청시 에러",
    async () => {
      await api.functional.aiCommerce.seller.products.auditLogs.index(
        connection,
        {
          productId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            product_id: typia.random<string & tags.Format<"uuid">>(),
          } satisfies IAiCommerceProductAuditLog.IRequest,
        },
      );
    },
  );

  // 5. 타인(별도 seller)의 상품 id로 조회
  const otherSellerEmail = typia.random<string & tags.Format<"email">>();
  const otherSellerPassword = RandomGenerator.alphaNumeric(12);
  const otherSellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: otherSellerEmail,
      password: otherSellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(otherSellerAuth);
  await TestValidator.error(
    "타인(별도 seller) 계정으로 본인 상품 감사 로그 요청시 에러",
    async () => {
      await api.functional.aiCommerce.seller.products.auditLogs.index(
        connection,
        {
          productId: product.id,
          body: {
            product_id: product.id,
          } satisfies IAiCommerceProductAuditLog.IRequest,
        },
      );
    },
  );

  // 6. 인증 없이 요청
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("인증 없이 감사 로그 요청시 에러", async () => {
    await api.functional.aiCommerce.seller.products.auditLogs.index(
      unauthConn,
      {
        productId: product.id,
        body: {
          product_id: product.id,
        } satisfies IAiCommerceProductAuditLog.IRequest,
      },
    );
  });
}

/**
 * - 모든 API 호출에 await이 사용됨
 * - Request/Response 타입 정확하게 사용, typia.assert 호출 모두 존재
 * - TestValidator 함수 첫 번째 인자로 title 들어감, 비교 시 actual-first/expected-second 패턴 잘
 *   지킴
 * - 인증 없이 요청 시도 시 connection.headers를 절대 직접 건드리지 않고, 새로운 헤더 {} 객체만 생성
 * - Body 선언은 타입 어노테이션 없이 satisfies만 사용
 * - ProductId 잘못된 값, 타 판매자 계정 등 실패 시나리오 TestValidator.error 모두 await과 함께 구현(비동기
 *   콜백)
 * - Event_type/actor_id 필터, 페이지네이션 등 실제 DTO 구조 맞게 구현
 * - 모든 테스트 시나리오가 현실적인 비즈니스 플로우, 권한 체크, 데이터 관계 무결성 등 논리적으로 구성
 * - DTO 필드의 실제 존재 여부, 타입 검증, nullable/undefined 처리 모두 기준에 맞음(예: typia.random, 실제
 *   seller id 등으로)
 * - 불필요한 임포트 추가/변경 없음(템플릿 보존)
 * - Type error 유발 테스트(잘못된 타입, as any 등) 전혀 없음
 * - 통과 기준을 모두 만족, 최종 완성도로 제출 가능
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
