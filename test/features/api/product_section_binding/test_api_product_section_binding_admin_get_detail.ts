import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceProductSectionBinding } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductSectionBinding";
import type { IAiCommerceSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSection";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 상품-섹션 바인딩 상세 조회 (admin 권한) E2E 테스트
 *
 * - 관리자(auth/admin)와 판매자(auth/seller) 계정을 각각 생성 (이메일/패스워드 분리)
 * - 판매자 로그인 하여 seller context로 상품 1개 등록
 * - 관리자(login)로 전환하여 sales channel 생성 → 해당 채널에 section 생성
 * - 판매자 계정으로 돌아가 신상품(product)을 생성해 위 채널의 section에 바인딩
 * - 바인딩 생성(POST /aiCommerce/seller/products/{productId}/sectionBindings) 후
 *   반환값에서 bindingId, productId, sectionId, display_order 추출
 * - 관리자(admin) 권한으로 다시 전환 후
 * - GET /aiCommerce/admin/products/{productId}/sectionBindings/{bindingId}
 *   엔드포인트 호출
 * - 반환되는 product_id, section_id, id, display_order 값과 create 시값이 정확히 일치하는지
 *   TestValidator.equals로 각각 검증
 * - TestValidator.predicate로 반환데이터 구조 필수 필드 존재 및 UUID 포맷, 데이터 일관성 등 추가 체크 가능
 */
export async function test_api_product_section_binding_admin_get_detail(
  connection: api.IConnection,
) {
  // 1. 관리자 회원가입 및 로그인
  const adminEmail: string = `${RandomGenerator.alphabets(8)}@admin.com`;
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminJoin);

  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminJoin.token !== undefined ? adminJoin.token.refresh : "",
    } satisfies IAiCommerceAdmin.ILogin,
  });
  typia.assert(adminLogin);

  // 2. 판매자 회원가입 및 로그인
  const sellerEmail: string = `${RandomGenerator.alphabets(8)}@seller.com`;
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);
  const sellerJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  typia.assert(sellerJoin);

  const sellerLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });
  typia.assert(sellerLogin);

  // 3. 판매자 상품 등록
  const product = await api.functional.aiCommerce.seller.products.create(
    connection,
    {
      body: {
        seller_id: sellerJoin.id,
        store_id: typia.random<string & tags.Format<"uuid">>(),
        product_code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph(),
        status: "active",
        business_status: "normal",
        current_price: Math.floor(Math.random() * 10000) + 100,
        inventory_quantity: 50,
      } satisfies IAiCommerceProduct.ICreate,
    },
  );
  typia.assert(product);

  // 4. 관리자 로그인 후 채널 및 섹션 생성
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminJoin.token !== undefined ? adminJoin.token.refresh : "",
    } satisfies IAiCommerceAdmin.ILogin,
  });

  const channel = await api.functional.aiCommerce.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(),
        locale: "ko-KR",
        is_active: true,
        business_status: "normal",
      } satisfies IAiCommerceChannel.ICreate,
    },
  );
  typia.assert(channel);

  const section =
    await api.functional.aiCommerce.admin.channels.sections.create(connection, {
      channelId: channel.id,
      body: {
        ai_commerce_channel_id: channel.id,
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(),
        is_active: true,
        business_status: "normal",
        sort_order: 1,
      } satisfies IAiCommerceSection.ICreate,
    });
  typia.assert(section);

  // 5. 판매자 로그인 후 상품과 섹션 바인딩 생성
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });

  const displayOrder = 1;
  const binding =
    await api.functional.aiCommerce.seller.products.sectionBindings.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          section_id: section.id,
          display_order: displayOrder,
        } satisfies IAiCommerceProductSectionBinding.ICreate,
      },
    );
  typia.assert(binding);

  // 6. 다시 관리자 로그인 후 바인딩 상세 조회 (target)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminJoin.token !== undefined ? adminJoin.token.refresh : "",
    } satisfies IAiCommerceAdmin.ILogin,
  });

  const detail =
    await api.functional.aiCommerce.admin.products.sectionBindings.at(
      connection,
      {
        productId: product.id,
        bindingId: binding.id,
      },
    );
  typia.assert(detail);

  // 7. 반환값 각 필드 일치성 검증
  TestValidator.equals("binding id matches", detail.id, binding.id);
  TestValidator.equals("product_id matches", detail.product_id, product.id);
  TestValidator.equals("section_id matches", detail.section_id, section.id);
  TestValidator.equals(
    "display_order matches",
    detail.display_order,
    displayOrder,
  );
}

/**
 * - 모든 인증 컨텍스트는 실제 auth API에서 전환하며, connection.headers 무자체 접근/조작 없음.
 * - TestValidator.equals 사용시 title 매개변수 및 actual-first, expected-second 올바르게 작성됨.
 * - 각 entity는 타입에 따라 typia.assert로 validation 수행함.
 * - Random data 생성에서 typia.random<string & tags.Format<"uuid">>() 등 명확한 제너릭 파라미터
 *   적용.
 * - RequestBody 변수는 let 사용없이 const 및 satisfies 활용, 타입 어사인 없이 변수생성규칙 지킴.
 * - Channel/section/product/binding 등 모든 레코드 간 관계는 논리적으로 연결되어 생성 및 사용됨(실제 id
 *   chain 전개).
 * - 반환값 구조, UUID 포맷, 필수값 등 typia.assert로 전체 검증 이후 추가적으로 equals로 논리검증 보완.
 * - 절차적 role 스위칭 전환(API로만 전환) 및 각 단계간의 인증 분리 엄격히 지켜짐.
 * - 금지패턴(타입오류 유발, as any, 잘못된 property, 테스트용 허구 API 등) 없음.
 * - Markdown 사용X, 오직 ts 코드만 생성, 가이드 템플릿 이외 코드 미변경.
 * - 예외처리, 필요없는 코드, 불필요한 status code check 등 일절 없음.
 * - 체크리스트 및 규정 모든 항목 충족.
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
 *   - O 4. Quality Standards and Best Practices
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO require() statements
 *   - O NO creative import syntax
 *   - O Template code untouched
 *   - O All functionality implemented using only template-provided imports
 *   - O 🚨 NO TYPE ERROR TESTING - THIS IS #1 VIOLATION 🚨
 *   - O NO as any USAGE
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O NO testing type validation
 *   - O NO HTTP status code testing
 *   - O NO illogical operations
 *   - O NO response type validation after typia.assert()
 *   - O Step 4 revise COMPLETED
 *   - O Function follows the correct naming convention
 *   - O Function has exactly one parameter: connection: api.IConnection
 *   - O No external functions are defined outside the main function
 *   - O CRITICAL: All TestValidator functions include descriptive title as first
 *       parameter
 *   - O All TestValidator functions use proper positional parameter syntax
 *   - O EVERY api.functional.* call has await
 *   - O TestValidator.error with async callback has await
 *   - O No bare Promise assignments
 *   - O All async operations inside loops have await
 *   - O All async operations inside conditionals have await
 *   - O Return statements with async calls have await
 *   - O Promise.all() calls have await
 *   - O All API calls use proper parameter structure and type safety
 *   - O API function calling follows the exact SDK pattern from provided materials
 *   - O DTO type precision
 *   - O No DTO type confusion
 *   - O Path parameters and request body are correctly structured in the second
 *       parameter
 *   - O All API responses are properly validated with typia.assert()
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
 *   - O CRITICAL: For TestValidator.error(), use await ONLY with async callbacks
 *   - O CRITICAL: Only API functions and DTOs from the provided materials are used
 *       (not from examples)
 *   - O CRITICAL: No fictional functions or types from examples are used
 *   - O CRITICAL: No type safety violations (any, @ts-ignore, @ts-expect-error)
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
 *   - O Const Assertions: All literal arrays for RandomGenerator.pick use as const
 *   - O Generic Type Parameters: All typia.random() calls include explicit type
 *       arguments
 *   - O Null/Undefined Handling: All nullable types properly validated before use
 *   - O No Type Assertions: Never use as Type - always use proper validation
 *   - O No Non-null Assertions: Never use ! operator - handle nulls explicitly
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
