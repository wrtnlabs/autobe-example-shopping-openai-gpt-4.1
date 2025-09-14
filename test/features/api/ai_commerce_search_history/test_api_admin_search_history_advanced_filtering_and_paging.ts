import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSearchHistory";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceSearchHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceSearchHistory";

/**
 * 관리자의 검색 기록 고급 필터 및 페이징 조회 테스트.
 *
 * 관리자 계정 생성 및 인증 컨텍스트 확립 후, PATCH /aiCommerce/admin/searchHistories 엔드포인트의
 * 다양한 필터와 페이징 동작을 검증함.
 *
 * 1. 관리자 회원가입 및 로그인
 * 2. 검색어 필터(query_string)
 * 3. 기간 필터(search_timestamp_from/search_timestamp_to) 적용
 * 4. Locale, buyer_id에 따른 필터링
 * 5. Page/limit 조합 페이징 테스트(1페이지 제한 및 여러 페이지 탐색)
 * 6. 잘못된 페이징 값(음수, 0, 비정상적으로 큰 값 등)에 대한 오류 반환 테스트 각 응답에서 페이징 pagination 구조가
 *    올바르고, 데이터 배열 속성/페이지 매칭 여부, 경계조건(필터 결과 없음, 마지막 페이지 등)도 검증한다.
 */
export async function test_api_admin_search_history_advanced_filtering_and_paging(
  connection: api.IConnection,
) {
  // 1. 관리자 계정 생성 및 로그인
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

  const adminAuth = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  typia.assert(adminAuth);

  // 2. 검색어(query_string) 필터 테스트
  const queryString = "ai";
  const byQuery = await api.functional.aiCommerce.admin.searchHistories.index(
    connection,
    {
      body: {
        query_string: queryString,
      } satisfies IAiCommerceSearchHistory.IRequest,
    },
  );
  typia.assert(byQuery);
  TestValidator.equals(
    "query_string 필터: pagination 참조 값",
    byQuery.pagination.current >= 1,
    true,
  );
  TestValidator.predicate(
    "query_string 결과 모든 항목은 해당 문자열 포함",
    byQuery.data.every((h) => h.query_string.includes(queryString)),
  );

  // 3. 기간 필터 테스트 (search_timestamp_from, search_timestamp_to)
  if (byQuery.data.length > 0) {
    const midIdx = Math.floor(byQuery.data.length / 2);
    const from = byQuery.data[0].search_timestamp,
      to = byQuery.data[midIdx].search_timestamp;
    const byDateRange =
      await api.functional.aiCommerce.admin.searchHistories.index(connection, {
        body: {
          search_timestamp_from: from,
          search_timestamp_to: to,
        } satisfies IAiCommerceSearchHistory.IRequest,
      });
    typia.assert(byDateRange);
    TestValidator.predicate(
      "기간 필터 결과는 from~to 범위 내에 있다",
      byDateRange.data.every(
        (h) => from <= h.search_timestamp && h.search_timestamp <= to,
      ),
    );
  }

  // 4. locale, buyer_id 필터 테스트 (존재하는 locale로)
  if (byQuery.data.length > 0) {
    const sample = byQuery.data.find(
      (h) => h.locale !== null && h.locale !== undefined,
    );
    if (sample && sample.locale) {
      const filtered =
        await api.functional.aiCommerce.admin.searchHistories.index(
          connection,
          {
            body: {
              locale: sample.locale,
            } satisfies IAiCommerceSearchHistory.IRequest,
          },
        );
      typia.assert(filtered);
      TestValidator.predicate(
        "locale 필터: 결과의 locale이 요청값과 일치",
        filtered.data.every((h) => h.locale === sample.locale),
      );
    }
    const userSample = byQuery.data.find(
      (h) =>
        h.ai_commerce_buyer_id !== null && h.ai_commerce_buyer_id !== undefined,
    );
    if (userSample && userSample.ai_commerce_buyer_id) {
      const userFiltered =
        await api.functional.aiCommerce.admin.searchHistories.index(
          connection,
          {
            body: {
              ai_commerce_buyer_id: userSample.ai_commerce_buyer_id,
            } satisfies IAiCommerceSearchHistory.IRequest,
          },
        );
      typia.assert(userFiltered);
      TestValidator.predicate(
        "ai_commerce_buyer_id 필터: 결과 buyer id 매칭",
        userFiltered.data.every(
          (h) => h.ai_commerce_buyer_id === userSample.ai_commerce_buyer_id,
        ),
      );
    }
  }

  // 5. 페이징(page, limit) 테스트
  const page = 1;
  const limit = 2;
  const pagingResult =
    await api.functional.aiCommerce.admin.searchHistories.index(connection, {
      body: { page, limit } satisfies IAiCommerceSearchHistory.IRequest,
    });
  typia.assert(pagingResult);
  TestValidator.equals(
    "페이징 pagination page 일치",
    pagingResult.pagination.current,
    page,
  );
  TestValidator.equals(
    "페이징 제한(limit) 이하 결과 배열 길이",
    pagingResult.data.length <= limit,
    true,
  );

  // 여러 페이지 이동 확인 (2페이지 요청)
  if (pagingResult.pagination.pages >= 2) {
    const secondPage =
      await api.functional.aiCommerce.admin.searchHistories.index(connection, {
        body: { page: 2, limit } satisfies IAiCommerceSearchHistory.IRequest,
      });
    typia.assert(secondPage);
    TestValidator.equals(
      "2페이지의 pagination current 일치",
      secondPage.pagination.current,
      2,
    );
  }

  // 6. 비정상/경계 페이징(음수 page, 0 limit 등) 오류 테스트
  await TestValidator.error("0 미만 page → 오류", async () => {
    await api.functional.aiCommerce.admin.searchHistories.index(connection, {
      body: { page: -1, limit } satisfies IAiCommerceSearchHistory.IRequest,
    });
  });
  await TestValidator.error("limit 0 → 오류", async () => {
    await api.functional.aiCommerce.admin.searchHistories.index(connection, {
      body: { page, limit: 0 } satisfies IAiCommerceSearchHistory.IRequest,
    });
  });
  await TestValidator.error("limit 음수 → 오류", async () => {
    await api.functional.aiCommerce.admin.searchHistories.index(connection, {
      body: { page, limit: -100 } satisfies IAiCommerceSearchHistory.IRequest,
    });
  });
}

/**
 * - 함수 설명, 테스트 시나리오 및 타입 사용 모두 제시된 재료와 TEST_WRITE.md 규칙을 철저히 준수함.
 * - 모든 API 호출에 await를 각 1회씩 정확히 부여함.
 * - Typia.assert() 사용, DTO 타입 변수 선언(T, T[]) 사용 방식에 위반 없음.
 * - 인증 컨텍스트 획득(API 로그인) 패턴 정확, connection.headers 미조작.
 * - TestValidator.title 파라미터, assertion actual→expected 패턴 일관 적용.
 * - 잘못된 page/limit 요청시 TestValidator.error에 await 적용 및 async 콜백.
 * - Type error 유도 또는 DTO 범위를 벗어나는 요청 없이, 경계조건 중심의 음수/0 등 business logic test로 설계.
 * - Null/undefined 체크 로직 분기 및 assertion 패턴도 명확.
 * - 타입 추론/명시 없이 typia.assert라고 불필요한 체크 반복 없음.
 * - 추가 import, require, creative syntax 미존재.
 * - Helper 함수 정의 없이 함수 본문만 순차적으로 처리. 트랜잭션 방식의 setup→action→assertion sequence 적용.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.0. Critical Requirements and Type Safety
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
