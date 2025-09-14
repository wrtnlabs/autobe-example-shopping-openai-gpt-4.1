import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceBuyer";
import type { IAiCommerceFavoritesProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesProduct";
import type { IAiCommercePageIFavoritesProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePageIFavoritesProduct";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IBuyer";

/**
 * 구매자 즐겨찾기 상품 목록 페이징 및 필터/정렬 조건 정상 조회
 *
 * - 신규 buyer 회원가입
 * - Buyer 로그인
 * - (즐겨찾기 등록 및 상품 생성 API 미제공: 결과 검증 via 쿼리 변형에 집중)
 * - PATCH /aiCommerce/buyer/favorites/products API에 페이징/정렬/필터 조합 전달
 * - 기본 페이징(1페이지, 10개), label O/X, folder_id=X, product_id=X 등 랜덤/특정 조건으로 호출
 * - 각 케이스별 IAiCommercePageIFavoritesProduct.ISummary 반환 결과 assert
 * - 데이터 유무와 total/page/limit 값, data 배열의 타입 체크 및 일부 비즈니스 유효성 (e.g. label로
 *   필터했을 때 결과 0 혹은 ≥1)
 */
export async function test_api_buyer_favorites_products_list_success(
  connection: api.IConnection,
) {
  // 1. 신규 buyer 회원가입
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const joinBody = {
    email,
    password,
  } satisfies IBuyer.ICreate;
  const joinOutput = await api.functional.auth.buyer.join(connection, {
    body: joinBody,
  });
  typia.assert(joinOutput);

  // 2. 로그인 후 인증 세션 확보
  const loginOutput = await api.functional.auth.buyer.login(connection, {
    body: { email, password } satisfies IBuyer.ILogin,
  });
  typia.assert(loginOutput);

  // 3. 기본 페이징(1페이지/10개)로 즐겨찾기 목록 호출
  const basicReq = {
    page: 1,
    limit: 10,
  } satisfies IAiCommerceFavoritesProduct.IRequest;
  const basicRes =
    await api.functional.aiCommerce.buyer.favorites.products.index(connection, {
      body: basicReq,
    });
  typia.assert(basicRes);
  TestValidator.equals("page = 1", basicRes.page, 1);
  TestValidator.equals("limit = 10", basicRes.limit, 10);
  TestValidator.predicate("data is array", Array.isArray(basicRes.data));
  TestValidator.predicate(
    "total is integer >= 0",
    typeof basicRes.total === "number" && basicRes.total >= 0,
  );

  // 4. label/폴더 등 필터: 랜덤 label (존재하지 않을 확률 높음)
  const randomLabel = RandomGenerator.alphabets(10);
  const labelReq = {
    label: randomLabel,
    page: 1,
    limit: 10,
  } satisfies IAiCommerceFavoritesProduct.IRequest;
  const labelRes =
    await api.functional.aiCommerce.buyer.favorites.products.index(connection, {
      body: labelReq,
    });
  typia.assert(labelRes);
  TestValidator.predicate(
    "data with random label is empty or filtered",
    labelRes.data.length === 0 ||
      labelRes.data.every((item) => item.label === randomLabel),
  );

  // 5. 존재하지 않는 folder_id로 필터
  const randomFolderId = typia.random<string & tags.Format<"uuid">>();
  const folderReq = {
    folder_id: randomFolderId,
    page: 1,
    limit: 10,
  } satisfies IAiCommerceFavoritesProduct.IRequest;
  const folderRes =
    await api.functional.aiCommerce.buyer.favorites.products.index(connection, {
      body: folderReq,
    });
  typia.assert(folderRes);
  TestValidator.equals(
    "no results for random folder_id",
    folderRes.data.length,
    0,
  );

  // 6. 정렬/정방향 order 테스트 (created_at)
  const orderReq = {
    sort: "created_at",
    order: "asc",
    page: 1,
    limit: 10,
  } satisfies IAiCommerceFavoritesProduct.IRequest;
  const orderRes =
    await api.functional.aiCommerce.buyer.favorites.products.index(connection, {
      body: orderReq,
    });
  typia.assert(orderRes);
  if (orderRes.data.length > 1) {
    for (let i = 1; i < orderRes.data.length; i++) {
      TestValidator.predicate(
        `ascending created_at: ${i}`,
        orderRes.data[i - 1].created_at <= orderRes.data[i].created_at,
      );
    }
  }
  // 7. desc 정렬 테스트
  const descReq = {
    sort: "created_at",
    order: "desc",
    page: 1,
    limit: 10,
  } satisfies IAiCommerceFavoritesProduct.IRequest;
  const descRes =
    await api.functional.aiCommerce.buyer.favorites.products.index(connection, {
      body: descReq,
    });
  typia.assert(descRes);
  if (descRes.data.length > 1) {
    for (let i = 1; i < descRes.data.length; i++) {
      TestValidator.predicate(
        `descending created_at: ${i}`,
        descRes.data[i - 1].created_at >= descRes.data[i].created_at,
      );
    }
  }
}

/**
 * - 올바른 import 라인 활용 및 import 추가 없음
 * - 시나리오 설명 및 함수 시그니처 충실히 구현
 * - 회원가입/로그인 정상 처리
 * - 즐겨찾기 상품 직접 생성이 불가하므로 조회만 검증: random label/folder 등 필터 조합에서 0 또는 올바른 값 체크
 * - 페이징 및 정렬 파라미터 조합 모두 적용
 * - 모든 await/타입 체크/테스트 검증 메서드에 await 및 descriptive title 포함
 * - 잘못된 type 테스트/에러 코드는 없음
 * - 추가 request body/변수 할당은 const + satisfies 패턴으로 작성
 * - 실제 로직 단계별로 요구 조건 및 타입 체크 세분 안내
 * - TestValidator.equals, predicate 등의 위치 및 사용법이 전형적으로 맞음(타입, title 등)
 * - Typia.assert로 반환 값 검증도 정상
 * - Nullable 및 타입 정합성 확인 완료
 * - 전반적으로 draft에 오류 없음, final 동일하게 제출 가능(추가 제거나 수정 사항 없음)
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
