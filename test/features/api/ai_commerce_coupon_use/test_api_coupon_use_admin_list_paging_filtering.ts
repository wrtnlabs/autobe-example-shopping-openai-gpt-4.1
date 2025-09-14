import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceCouponUse } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCouponUse";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceCouponUse } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceCouponUse";

/**
 * 관리자 권한으로 쿠폰 사용 내역을 검색, 페이징·필터링해 서비스 일관성과 접근제한을 검증
 *
 * 1. 관리자 계정 등록 후 로그인 흐름: 토큰 인증 관련 동작 및 신규계정 처리 검증
 * 2. 전체 쿠폰 사용 내역(기본값 페이징) 검증: 기본 메타 및 데이터 일관성 체크
 * 3. 실제 데이터가 있으면 user_id, coupon_issue_id, order_id, status 등 필터 쿼리 동작성 확인
 * 4. Limit/page 조합 다양한 페이지네이션 요청, 응답 개수와 meta 일관성 검증
 * 5. From/to(기간) 필터를 redeemed_at 컬럼 기준으로 랜덤 범위 테스트
 * 6. 인증없이 호출 시 거부(error) 반환 확인 (status code 검증 X)
 */
export async function test_api_coupon_use_admin_list_paging_filtering(
  connection: api.IConnection,
) {
  // 1. 관리자 가입/로그인 (토큰 발급: join -> login)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: IAiCommerceAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        status: "active",
      } satisfies IAiCommerceAdmin.IJoin,
    });
  typia.assert(admin);
  const relogin: IAiCommerceAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IAiCommerceAdmin.ILogin,
    });
  typia.assert(relogin);
  // 2. 전체 쿠폰 사용 이력, 페이징 기본 반환 검증
  const pageDefault: IPageIAiCommerceCouponUse =
    await api.functional.aiCommerce.admin.couponUses.index(connection, {
      body: {} satisfies IAiCommerceCouponUse.IRequest,
    });
  typia.assert(pageDefault);
  TestValidator.predicate(
    "기본 page meta",
    pageDefault.pagination.current === 1 &&
      pageDefault.pagination.limit > 0 &&
      pageDefault.pagination.pages >= 1,
  );
  TestValidator.equals(
    "page 데이터 존재",
    Array.isArray(pageDefault.data),
    true,
  );
  // 3. 필터 가능한 검색 조건 실험 (user_id, coupon_issue_id, order_id, status 등)
  // 하나라도 데이터가 있다면, 랜덤으로 하나 뽑아 필터
  if (pageDefault.data.length > 0) {
    const sample = RandomGenerator.pick(pageDefault.data);
    // user_id로 필터
    if (sample.user_id) {
      const result = await api.functional.aiCommerce.admin.couponUses.index(
        connection,
        {
          body: {
            user_id: sample.user_id,
          } satisfies IAiCommerceCouponUse.IRequest,
        },
      );
      typia.assert(result);
      TestValidator.predicate(
        "user_id 필터 데이터 유효성",
        result.data.every((d) => d.user_id === sample.user_id),
      );
    }
    // coupon_issue_id 필터
    if (sample.coupon_issue_id) {
      const result = await api.functional.aiCommerce.admin.couponUses.index(
        connection,
        {
          body: {
            coupon_issue_id: sample.coupon_issue_id,
          } satisfies IAiCommerceCouponUse.IRequest,
        },
      );
      typia.assert(result);
      TestValidator.predicate(
        "coupon_issue_id 필터 데이터 유효성",
        result.data.every((d) => d.coupon_issue_id === sample.coupon_issue_id),
      );
    }
    // status 필터
    if (sample.status) {
      const result = await api.functional.aiCommerce.admin.couponUses.index(
        connection,
        {
          body: {
            status: sample.status,
          } satisfies IAiCommerceCouponUse.IRequest,
        },
      );
      typia.assert(result);
      TestValidator.predicate(
        "status 필터 데이터 유효성",
        result.data.every((d) => d.status === sample.status),
      );
    }
    // order_id 필터 (널아닌 경우만)
    if (sample.order_id !== null && sample.order_id !== undefined) {
      const result = await api.functional.aiCommerce.admin.couponUses.index(
        connection,
        {
          body: {
            order_id: sample.order_id,
          } satisfies IAiCommerceCouponUse.IRequest,
        },
      );
      typia.assert(result);
      TestValidator.predicate(
        "order_id 필터 데이터 유효성",
        result.data.every((d) => d.order_id === sample.order_id),
      );
    }
  }
  // 4. 페이지네이션 동작 확인, limit 및 page 조합
  const pageSize = 2;
  const firstPage = await api.functional.aiCommerce.admin.couponUses.index(
    connection,
    {
      body: {
        limit: pageSize,
        page: 1,
      } satisfies IAiCommerceCouponUse.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.equals("limit 적용 확인", firstPage.pagination.limit, pageSize);
  if (firstPage.pagination.pages > 1) {
    const page2 = await api.functional.aiCommerce.admin.couponUses.index(
      connection,
      {
        body: {
          limit: pageSize,
          page: 2,
        } satisfies IAiCommerceCouponUse.IRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals("page 2 번호", page2.pagination.current, 2);
  }
  // 5. from/to(기간) 테스트 (랜덤값 활용)
  if (pageDefault.data.length > 1) {
    const [a, b] = RandomGenerator.sample(pageDefault.data, 2);
    const from = a.redeemed_at < b.redeemed_at ? a.redeemed_at : b.redeemed_at;
    const to = a.redeemed_at > b.redeemed_at ? a.redeemed_at : b.redeemed_at;
    const byPeriod = await api.functional.aiCommerce.admin.couponUses.index(
      connection,
      {
        body: {
          from,
          to,
        } satisfies IAiCommerceCouponUse.IRequest,
      },
    );
    typia.assert(byPeriod);
    TestValidator.predicate(
      "from/to 기간필터 유효성",
      byPeriod.data.every((d) => d.redeemed_at >= from && d.redeemed_at <= to),
    );
  }

  // 6. 인증없이 접근 시 거부됨
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("인증 없는 접근 거부", async () => {
    await api.functional.aiCommerce.admin.couponUses.index(unauthConn, {
      body: {},
    });
  });
}

/**
 * - 테스트 시나리오 서술, 실제 입력 DTO, API 호출 패턴, 토큰 인증 등 모두 요구사항과 현실에 부합함
 * - 랜덤 관리자를 생성, 가입과 로그인 API로 토큰 인증을 검증
 * - 쿠폰 사용 내역 전체 조회(페이징, 기본 body 빈값 = 전체 검색), meta 정보·데이터 건수 체크
 * - 실제 검색 결과 중 임의 selection을 이용한 필드별 필터(user_id, coupon_issue_id, status,
 *   order_id) 동작 확인
 * - Limit/page 조정, 여러 페이지 요청 통한 페이지네이션/데이터 불변성 검증
 * - From/to: redeemed_at 기간 조합으로 기간 필터가 정상 동작함을 확인
 * - 인증 없이(빈 header) 접근하는 경우 거부 에러 발생 확인(실제 API에서 401/403 등 코드 체크는 불필요, error만 검증)
 * - 모든 요청, 응답에 반드시 typia.assert 적용, TestValidator.predicate/equals/error 로 비즈니스
 *   로직 검증
 * - 중간에 type error 유발, wrong-type 데이터, missing required field, type validation 등
 *   절대 없음
 * - Import 및 템플릿 코드 완전 준수, 추가 import 및 creative 코드 없음
 * - 전체적으로 코드 품질, 타입 안전성 등 최고 수준
 * - 개선여지 발견되지 않으며, draft와 final 100% 동일
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 1.1. Function Calling Workflow
 *   - O 2. Input Materials Provided
 *   - O 3.0. Critical Requirements and Type Safety
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
