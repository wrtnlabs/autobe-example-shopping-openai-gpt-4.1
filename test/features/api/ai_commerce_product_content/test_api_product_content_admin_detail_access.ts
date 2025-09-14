import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceProductContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductContent";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 관리자가 상품 컨텐츠의 상세 정보에 정상적으로 접근할 수 있어야 하고, 존재하지 않는 경우에는 404 에러가 반환되어야 함을
 * 검증한다.
 *
 * 1. 랜덤 관리자 계정으로 회원가입 및 인증
 * 2. 관리자로 임의의 신상품 등록, productId 확보
 * 3. 해당 상품에 컨텐츠 신규 추가, contentId 확보
 * 4. 컨텐츠 상세 조회 (GET), 주요 필드 일치 확인 및 타입 assert
 * 5. 상품/컨텐츠 ID 하나라도 무효(랜덤)로 접근 시 404 error 인지
 */
export async function test_api_product_content_admin_detail_access(
  connection: api.IConnection,
) {
  // 1. 관리자 회원가입
  const joinAdmin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  typia.assert(joinAdmin);
  const adminId = joinAdmin.id;

  // 2. 상품 등록 (seller_id, store_id는 UUID 랜덤 값)
  const createProduct = await api.functional.aiCommerce.admin.products.create(
    connection,
    {
      body: {
        seller_id: typia.random<string & tags.Format<"uuid">>(),
        store_id: typia.random<string & tags.Format<"uuid">>(),
        product_code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        status: "active",
        business_status: "pending_approval",
        current_price: 10000,
        inventory_quantity: 50,
      } satisfies IAiCommerceProduct.ICreate,
    },
  );
  typia.assert(createProduct);

  // 3. 상품 컨텐츠 생성
  const createContent =
    await api.functional.aiCommerce.admin.products.contents.create(connection, {
      productId: createProduct.id,
      body: {
        content_type: "description",
        format: "plain_text",
        locale: "ko-KR",
        content_body: RandomGenerator.paragraph({ sentences: 5 }),
        display_order: 1,
      } satisfies IAiCommerceProductContent.ICreate,
    });
  typia.assert(createContent);

  // 4. 상세 조회 정상 케이스
  const detail = await api.functional.aiCommerce.admin.products.contents.at(
    connection,
    {
      productId: createProduct.id,
      contentId: createContent.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("컨텐츠 상세 major fields", detail.id, createContent.id);
  TestValidator.equals("컨텐츠 상세 타입", detail.product_id, createProduct.id);
  TestValidator.equals(
    "컨텐츠 상세 구조: 타입/포맷",
    detail.content_type,
    createContent.content_type,
  );
  TestValidator.equals(
    "컨텐츠 상세 구조: 포맷",
    detail.format,
    createContent.format,
  );
  TestValidator.equals(
    "컨텐츠 상세 구조: display_order",
    detail.display_order,
    createContent.display_order,
  );
  TestValidator.equals(
    "컨텐츠 상세 구조: 본문",
    detail.content_body,
    createContent.content_body,
  );
  TestValidator.equals(
    "컨텐츠 상세 구조: locale",
    detail.locale,
    createContent.locale,
  );

  // 5. 존재하지 않는 productId/contentId 각각/동시 404 에러
  const randomProductId = typia.random<string & tags.Format<"uuid">>();
  const randomContentId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.error(
    "없는 productId와 contentId로 상세조회시 에러",
    async () => {
      await api.functional.aiCommerce.admin.products.contents.at(connection, {
        productId: randomProductId,
        contentId: randomContentId,
      });
    },
  );
  await TestValidator.error(
    "없는 productId, 실제 contentId로 상세조회시 에러",
    async () => {
      await api.functional.aiCommerce.admin.products.contents.at(connection, {
        productId: randomProductId,
        contentId: createContent.id,
      });
    },
  );
  await TestValidator.error(
    "실제 productId, 없는 contentId로 상세조회시 에러",
    async () => {
      await api.functional.aiCommerce.admin.products.contents.at(connection, {
        productId: createProduct.id,
        contentId: randomContentId,
      });
    },
  );
}

/**
 * - All steps use only DTO fields and SDK functions that exist in the provided
 *   input materials.
 * - No additional imports or modifications to the template imports are present.
 * - All API calls use await, and TestValidator.error for async results uses
 *   await.
 * - All test data is generated with typia.random and RandomGenerator, using
 *   proper tags/format.
 * - All required properties for product and content creation are provided.
 * - Field existence and name compliance are strictly observed; no extraneous
 *   fields or properties are created/used.
 * - No business logic or type error test (e.g., as any, wrong types) is present.
 * - All TestValidator assertions have descriptive title as their first argument.
 * - No compilation errors are detected in the function.
 * - Locale for content creation is optional; here explicitly provided as 'ko-KR'.
 * - Error test for not found conditions is valid and no forbidden status code
 *   match is attempted (functionality is encapsulated in TestValidator.error,
 *   not status code match).
 * - Confirmed proper compliance with all rules and checklists from the guidance.
 *   No additional changes needed.
 * - The code block is not surrounded by Markdown nor has code block syntax. It is
 *   a proper .ts-file code body.
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.2. API SDK Function Invocation
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.4. Random Data Generation
 *   - O 3.5. Handling Nullable and Undefined Values
 *   - O 3.6. TypeScript Type Narrowing and Control Flow Analysis
 *   - O 3.7. Authentication Handling
 *   - O 3.7. Logic Validation and Assertions
 *   - O 3.8. Complete Example
 *   - O 4. Quality Standards and Best Practices
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O No compilation errors
 *   - O Proper async/await usage
 *   - O No DTO type confusion
 *   - O All TestValidator functions have title as first parameter
 *   - O Final is updated when review found errors
 */
const __revise = {};
__revise;
