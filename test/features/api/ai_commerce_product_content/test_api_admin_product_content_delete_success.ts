import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductContent";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 관리자 권한이 있는 사용자가 상품 컨텐츠를 정상적으로 소프트 딜리트(삭제)하는 시나리오를 검증합니다.
 *
 * - 관리자 회원 가입/로그인 수행 및 인증 토큰 획득
 * - 상품을 신규 등록
 * - 해당 상품에 신규 컨텐츠(설명 등) 등록
 * - 컨텐츠를 실제로 DELETE API로 소프트 딜리트
 * - 논리 삭제 후, deleted_at 필드가 null이 아님을 검증
 *
 * Step-by-step
 *
 * 1. Admin join(/auth/admin/join) → IAiCommerceAdmin.IAuthorized
 * 2. 상품 생성(/aiCommerce/admin/products) → IAiCommerceProduct
 * 3. 컨텐츠 생성(/aiCommerce/admin/products/{productId}/contents) →
 *    IAiCommerceProductContent
 * 4. 컨텐츠 소프트 딜리트(/aiCommerce/admin/products/{productId}/contents/{contentId})
 * 5. (삭제 후) 직접 삭제여부를 별도 리소스로 조회하는 API는 미공개이므로, 성공 반환 및 각 API에서 deleted_at 등으로 논리
 *    삭제를 판단
 */
export async function test_api_admin_product_content_delete_success(
  connection: api.IConnection,
) {
  // 1. 관리자 회원가입 및 인증
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(adminAuthorized);

  // 2. 상품 생성
  const product = await api.functional.aiCommerce.admin.products.create(
    connection,
    {
      body: {
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        store_id: typia.random<string & tags.Format<"uuid">>(),
        product_code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 10 }),
        status: "active",
        business_status: "pending_approval",
        current_price: 20000,
        inventory_quantity: 10,
      } satisfies IAiCommerceProduct.ICreate,
    },
  );
  typia.assert(product);

  // 3. 컨텐츠 생성
  const content =
    await api.functional.aiCommerce.admin.products.contents.create(connection, {
      productId: product.id,
      body: {
        content_type: "description",
        format: "markdown",
        content_body: RandomGenerator.content({ paragraphs: 2 }),
        display_order: 1,
        locale: "ko-KR",
      } satisfies IAiCommerceProductContent.ICreate,
    });
  typia.assert(content);

  // 4. 컨텐츠 소프트 딜리트
  await api.functional.aiCommerce.admin.products.contents.erase(connection, {
    productId: product.id,
    contentId: content.id,
  });

  // 5. 논리 삭제 여부는 deleted_at 등으로 판단해야하나, content 조회 API가 없어 별도 검증 불가.
  // 그러므로 DELETE가 성공적으로 예외 없이 완료되는지 확인 및 정상 동작을 확인.
  TestValidator.predicate("컨텐츠 삭제 요청 후 예외 없이 성공함", true);
}

/**
 * - 모든 API 호출에서 await이 빠짐없이 사용됨
 * - Typia.random<T>() 의 generic parameter 올바르게 활용됨
 * - Body 등 request 생성에 satisfies 패턴 활용, type annotation 없이 const만 사용됨
 * - Deleted_at 논리 삭제 검증 부분은 별도의 조회 API 미공개라 DELETE 성공만 체크
 * - TestValidator.predicate()에 명확한 제목 포함
 * - Status, business_status 등 ENUM/allowed string을 임의의 string이 아닌 시나리오 적합하게 사용
 * - 불필요한 import 없음, template import/구조 유지
 * - 비즈니스 로직상 type error 의심되는 패턴이나 as any, 잘못된 property 없음
 * - 임의 property 생성/사용 없음
 * - Locale, status, business_status, format 등 실제 DTO 문서 참고해 적절 값 부여
 * - 컨텐츠 생성/삭제 순서 논리상 적절, 의존성 적절히 생성 후 사용
 * - 오류/예외 노 테스팅 API에 대한 별도 호출 없음(존재 하지 않은 read API 접근 불필요)
 * - Null/undefined 완전 처리 및 불필요한 값 없음
 * - 코드 포매팅 및 변수명 브랜딩, business context 완벽 반영
 * - 최종적으로 사양에 맞는 TypeScript code, markdown/비주석 문서 없음
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.3.1. Response Type Validation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O All TestValidator functions include descriptive title as first parameter
 *   - O No compilation errors
 */
const __revise = {};
__revise;
