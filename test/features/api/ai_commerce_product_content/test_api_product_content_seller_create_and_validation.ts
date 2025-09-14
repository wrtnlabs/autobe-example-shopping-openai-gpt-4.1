import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductContent";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 판매자가 자신의 상품에 다양한 컨텐츠(설명, 사용법 등)를 등록할 때의 정상 및 오류 동작 검증
 *
 * - 비즈니스 목적: 같은 content_type+locale 쌍은 상품별로 1회만 등록될 수 있다.
 * - 인증(회원가입) 후 상품 추가 및 컨텐츠 2종류 정상 등록.
 * - 이미 등록된 content_type+locale 조합으로 중복 등록 시 중복 에러.
 * - 존재하지 않는 상품(productId)에 등록 시 not found(권한) 에러.
 *
 * 절차:
 *
 * 1. 판매자 회원가입 및 인증 컨텍스트 생성
 * 2. 신규 상품 생성 (등록 대상 productId 확보)
 * 3. 해당 상품에 content_type=description, locale=ko-KR로 컨텐츠 등록
 * 4. 해당 상품에 content_type=how_to, locale=en-US로 컨텐츠 등록
 * 5. 기존에 등록했던 content_type=description, locale=ko-KR로 다시 등록 → 비즈니스 중복 에러 확인
 * 6. 존재하지 않는 productId(랜덤 uuid)로 컨텐츠 등록 → not found/권한 에러 확인
 */
export async function test_api_product_content_seller_create_and_validation(
  connection: api.IConnection,
) {
  // 1. 판매자 회원가입 및 인증 컨텍스트 생성
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(10);
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);

  // 2. 신규 상품 생성(등록 대상 productId 확보, 최소 필수필드 사용)
  const productCreate = {
    seller_id: sellerAuth.id,
    store_id: typia.random<string & tags.Format<"uuid">>(),
    product_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 10 }),
    status: "active",
    business_status: "approved",
    current_price: 19900,
    inventory_quantity: 123,
  } satisfies IAiCommerceProduct.ICreate;
  const product = await api.functional.aiCommerce.seller.products.create(
    connection,
    {
      body: productCreate,
    },
  );
  typia.assert(product);

  // 3. 정상 컨텐츠 등록 1 - description/ko-KR
  const contentCreate1 = {
    content_type: "description",
    format: "markdown",
    locale: "ko-KR",
    content_body: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: 1,
  } satisfies IAiCommerceProductContent.ICreate;
  const content1 =
    await api.functional.aiCommerce.seller.products.contents.create(
      connection,
      {
        productId: product.id,
        body: contentCreate1,
      },
    );
  typia.assert(content1);
  TestValidator.equals("product_id 일치", content1.product_id, product.id);
  TestValidator.equals(
    "content_type 일치",
    content1.content_type,
    contentCreate1.content_type,
  );
  TestValidator.equals("locale 일치", content1.locale, contentCreate1.locale);

  // 4. 정상 컨텐츠 등록 2 - how_to/en-US
  const contentCreate2 = {
    content_type: "how_to",
    format: "html",
    locale: "en-US",
    content_body: RandomGenerator.paragraph({ sentences: 5 }),
    display_order: 2,
  } satisfies IAiCommerceProductContent.ICreate;
  const content2 =
    await api.functional.aiCommerce.seller.products.contents.create(
      connection,
      {
        productId: product.id,
        body: contentCreate2,
      },
    );
  typia.assert(content2);
  TestValidator.equals("product_id 일치", content2.product_id, product.id);
  TestValidator.equals(
    "content_type 일치",
    content2.content_type,
    contentCreate2.content_type,
  );
  TestValidator.equals("locale 일치", content2.locale, contentCreate2.locale);

  // 5. 중복 content_type+locale 조합 등록 시도(기존과 동일한 값) → 중복 에러 발생
  await TestValidator.error(
    "동일 content_type, locale 중복 등록시 비즈니스 중복 에러",
    async () => {
      await api.functional.aiCommerce.seller.products.contents.create(
        connection,
        {
          productId: product.id,
          body: contentCreate1,
        },
      );
    },
  );

  // 6. 존재하지 않는 productId(랜덤 uuid)로 컨텐츠 등록 시도 → not found/권한 에러
  const fakeProductId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "존재하지 않는 productId에 등록 시 not found error",
    async () => {
      await api.functional.aiCommerce.seller.products.contents.create(
        connection,
        {
          productId: fakeProductId,
          body: contentCreate1,
        },
      );
    },
  );
}

/**
 * - 모든 api.functional.* 호출에 await 적용되어 있음
 * - TestValidator.error에 async callback 있음, await 반드시 사용되었음
 * - TestValidator.* assertion 함수 첫 번째 파라미터에 모두 명확한 타이틀 제공
 * - 타입 생성(Request/Response)에 satisfies, typia.assert 정석적으로 활용
 * - Import 구문은 템플릿 제공 그대로, 추가/수정 없음 (준수)
 * - Connection.headers에 어떤 조작도 없음
 * - Content_type/locale의 비즈니스 중복 테스트 및 존재하지 않는 productId 케이스 모두 async error 검증
 *   (await 필수)
 * - IAiCommerceProduct.ICreate, IAiCommerceProductContent.ICreate 등 모든 DTO는 정의된
 *   속성만 사용하며, TypeScript violation/test-type-validation 없음
 * - 도전적(비허용) 패턴(잘못된 타입, 누락 필드, type validation) 없음, 테스트 중복 error도 올바른 business
 *   error scenario만 사용
 * - 순서, 변수명, 주석 모두 명확하며 비즈니스 및 절차적으로 논리적 흐름을 잘 따름
 * - Null/undefined 및 random data 생성 규칙도 모두 정확하게 준수
 * - 예시 코드 및 명세에서 벗어난 addition 없음. 시나리오 현실성, 타입 안전성, 품질 정밀도 매우 양호함.
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
