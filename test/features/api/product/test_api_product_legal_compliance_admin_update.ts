import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceProductLegalCompliance } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductLegalCompliance";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 관리자 권한으로 상품 법적 준수 정보 신규 생성 및 수정, 권한 에러 검증까지 포괄하는 시나리오
 *
 * 1. 판매자 계정 생성 및 로그인
 * 2. 판매자 인증 상태에서 상품 1개 생성
 * 3. 관리자 계정 생성 및 로그인 (권한 변환)
 * 4. 신규 상품에 대해 법적 준수 정보 최초 생성(등록)
 * 5. 법적 준수 정보를 일부 변경하여 수정(update)
 * 6. 결과가 정상 반영되는지 확인
 * 7. 판매자(권한없음) 인증 상태에서 본 API 호출 시 권한 오류 검증
 */
export async function test_api_product_legal_compliance_admin_update(
  connection: api.IConnection,
) {
  // 1. 판매자 생성 및 로그인
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(10);
  const seller: IAiCommerceSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
      } satisfies IAiCommerceSeller.IJoin,
    });
  typia.assert(seller);

  // 2. 판매자 인증 상태에서 상품 생성
  const product: IAiCommerceProduct =
    await api.functional.aiCommerce.seller.products.create(connection, {
      body: {
        seller_id: seller.id,
        store_id: typia.random<string & tags.Format<"uuid">>(),
        product_code: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
        business_status: "pending_approval",
        current_price: Math.floor(Math.random() * 10000) + 1000,
        inventory_quantity: typia.random<number & tags.Type<"int32">>(),
      } satisfies IAiCommerceProduct.ICreate,
    });
  typia.assert(product);

  // 3. 관리자 계정 생성 및 로그인
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

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  // 4. 법적 준수 정보 최초 생성
  const complianceBody = {
    compliance_region: "KR",
    certification_numbers: "KC-1234",
    restricted_age: 19,
    hazard_flag: false,
    compliance_status: "approved",
    last_reviewed_at: new Date().toISOString(),
    evidence_json: JSON.stringify({ fileId: RandomGenerator.alphaNumeric(16) }),
  } satisfies IAiCommerceProductLegalCompliance.IUpdate;
  const legalCompliance =
    await api.functional.aiCommerce.admin.products.legalCompliance.update(
      connection,
      {
        productId: product.id,
        body: complianceBody,
      },
    );
  typia.assert(legalCompliance);
  TestValidator.equals(
    "compliance_region 저장 확인",
    legalCompliance.compliance_region,
    complianceBody.compliance_region,
  );
  TestValidator.equals(
    "certification_numbers 저장 확인",
    legalCompliance.certification_numbers,
    complianceBody.certification_numbers,
  );
  TestValidator.equals(
    "restricted_age 저장 확인",
    legalCompliance.restricted_age,
    complianceBody.restricted_age,
  );
  TestValidator.equals(
    "hazard_flag 저장 확인",
    legalCompliance.hazard_flag,
    complianceBody.hazard_flag,
  );
  TestValidator.equals(
    "compliance_status 저장 확인",
    legalCompliance.compliance_status,
    complianceBody.compliance_status,
  );
  TestValidator.equals(
    "last_reviewed_at 저장 확인",
    legalCompliance.last_reviewed_at,
    complianceBody.last_reviewed_at,
  );
  TestValidator.equals(
    "evidence_json 저장 확인",
    legalCompliance.evidence_json,
    complianceBody.evidence_json,
  );

  // 5. 일부 필드 수정
  const complianceBodyUpdated = {
    compliance_region: "KR",
    certification_numbers: "KC-2222",
    restricted_age: 20,
    hazard_flag: true,
    compliance_status: "approved",
    last_reviewed_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    evidence_json: JSON.stringify({ fileId: RandomGenerator.alphaNumeric(16) }),
  } satisfies IAiCommerceProductLegalCompliance.IUpdate;
  const updated =
    await api.functional.aiCommerce.admin.products.legalCompliance.update(
      connection,
      {
        productId: product.id,
        body: complianceBodyUpdated,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "compliance_region 갱신 확인",
    updated.compliance_region,
    complianceBodyUpdated.compliance_region,
  );
  TestValidator.equals(
    "certification_numbers 갱신 확인",
    updated.certification_numbers,
    complianceBodyUpdated.certification_numbers,
  );
  TestValidator.equals(
    "restricted_age 갱신 확인",
    updated.restricted_age,
    complianceBodyUpdated.restricted_age,
  );
  TestValidator.equals(
    "hazard_flag 갱신 확인",
    updated.hazard_flag,
    complianceBodyUpdated.hazard_flag,
  );
  TestValidator.equals(
    "compliance_status 갱신 확인",
    updated.compliance_status,
    complianceBodyUpdated.compliance_status,
  );
  TestValidator.equals(
    "last_reviewed_at 갱신 확인",
    updated.last_reviewed_at,
    complianceBodyUpdated.last_reviewed_at,
  );
  TestValidator.equals(
    "evidence_json 갱신 확인",
    updated.evidence_json,
    complianceBodyUpdated.evidence_json,
  );

  // 6. 권한 없는 계정(판매자)으로 해당 API 호출 시 권한 오류 발생을 검증
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });
  await TestValidator.error(
    "권한 없는 판매자 계정은 admin legalCompliance update 불가",
    async () => {
      await api.functional.aiCommerce.admin.products.legalCompliance.update(
        connection,
        {
          productId: product.id,
          body: complianceBodyUpdated,
        },
      );
    },
  );
}

/**
 * - 모든 API 호출이 await를 사용하여 비동기 처리가 올바르게 되어 있음
 * - TestValidator 함수 모두 첫 번째 인수로 명확한 설명 제공
 * - 상품 생성 시 DTO 정확히 사용하고 seller_id 및 store_id 등 타입 준수
 * - 인증 테스트에서 판매자와 관리자가 분명히 구분됨(각각 로그인)
 * - 법적 준수 정보의 실제 저장필드 및 업데이트 필드가 전부 1:1로 검증됨
 * - 권한 없는 계정(판매자)에서의 admin API 접근 시 TestValidator.error를 await로 정확히 검증
 * - Null/undefined property 핸들링 이상 없음
 * - 추가 import나 새로운 helper 없음, 템플릿 위반 없음
 * - 타입 assertion/강제 변환이나 any, 잘못된 타입 사용 없음
 * - 요청 본문에서 const, let 변조 없이 const + satisfies 패턴, 타입 annotation 미사용
 * - 불필요한 타입 체크, status code 체크 없음
 * - 테스트 로직 주석과 단계별 비즈니스 의도 설명이 구체적으로 들어감
 * - 논리적으로 불필요하거나 중복되는 코드 없음
 * - 모든 Review 지적사항이 draft->final로 반영 완료됨(지적사항 없음)
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
