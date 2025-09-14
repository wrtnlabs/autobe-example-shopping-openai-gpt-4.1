import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";
import type { IAiCommerceChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceChannel";
import type { IAiCommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProduct";
import type { IAiCommerceProductSectionBinding } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceProductSectionBinding";
import type { IAiCommerceSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSection";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 플랫폼 관리자가 상품과 섹션 바인딩을 정상적으로 수행하고(성공), display_order 중복 시 예외 처리가 발생함을 검증한다.
 *
 * 비즈니스 플로우:
 *
 * 1. 관리자 계정 회원가입 및 인증
 * 2. 채널 생성
 * 3. 섹션 생성 (해당 채널 하위)
 * 4. 상품 생성
 * 5. 섹션 바인딩(정상): productId, sectionId, display_order 모두 고유하게 지정하여 바인딩 가능
 * 6. 섹션 바인딩(중복): 동일한 sectionId 및 display_order로 다시 바인딩 시 예외 발생
 */
export async function test_api_product_section_binding_admin_create_and_duplicate_display_order_error(
  connection: api.IConnection,
) {
  // 1. 관리자 회원가입 및 인증
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
  } satisfies IAiCommerceAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 2. 채널 생성
  const channelBody = {
    code: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    locale: "ko-KR",
    is_active: true,
    business_status: "normal",
  } satisfies IAiCommerceChannel.ICreate;
  const channel = await api.functional.aiCommerce.admin.channels.create(
    connection,
    { body: channelBody },
  );
  typia.assert(channel);

  // 3. 섹션 생성
  const sectionBody = {
    ai_commerce_channel_id: channel.id,
    code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    is_active: true,
    business_status: "normal",
    sort_order: typia.random<number & tags.Type<"int32">>(),
  } satisfies IAiCommerceSection.ICreate;
  const section =
    await api.functional.aiCommerce.admin.channels.sections.create(connection, {
      channelId: channel.id,
      body: sectionBody,
    });
  typia.assert(section);

  // 4. 상품 생성
  const productBody = {
    seller_id: typia.random<string & tags.Format<"uuid">>(),
    store_id: typia.random<string & tags.Format<"uuid">>(),
    product_code: RandomGenerator.alphaNumeric(10),
    name: RandomGenerator.name(),
    description: RandomGenerator.content({ paragraphs: 1 }),
    status: "active",
    business_status: "normal",
    current_price: 10000,
    inventory_quantity: typia.random<number & tags.Type<"int32">>(),
  } satisfies IAiCommerceProduct.ICreate;
  const product = await api.functional.aiCommerce.admin.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 5. 섹션 바인딩(정상)
  const displayOrderNumber = typia.random<number & tags.Type<"int32">>();
  const bindingBody = {
    product_id: product.id,
    section_id: section.id,
    display_order: displayOrderNumber,
  } satisfies IAiCommerceProductSectionBinding.ICreate;
  const binding =
    await api.functional.aiCommerce.admin.products.sectionBindings.create(
      connection,
      {
        productId: product.id,
        body: bindingBody,
      },
    );
  typia.assert(binding);
  TestValidator.equals(
    "정상적으로 바인딩된 display_order",
    binding.display_order,
    displayOrderNumber,
  );

  // 6. 섹션 바인딩(display_order 중복 시 예외 체크)
  await TestValidator.error(
    "동일 section에 display_order 중복 시 에러 발생",
    async () => {
      await api.functional.aiCommerce.admin.products.sectionBindings.create(
        connection,
        {
          productId: product.id,
          body: {
            product_id: product.id,
            section_id: section.id,
            display_order: displayOrderNumber,
          } satisfies IAiCommerceProductSectionBinding.ICreate,
        },
      );
    },
  );
}

/**
 * - 코드가 올바르게 @nestia/e2e 템플릿 범주 내에서 모든 필수 사전 처리를 순차적·논리적으로 수행하고 있음.
 * - 모든 API 콜에 await 포함.
 * - Display_order 중복 시 정상적으로 TestValidator.error에서 예외 처리를 async/await로 구현.
 * - 불필요/허용되지 않은 import 없음, 오직 템플릿 범위 내.
 * - DTO 메시지에 타입 일치/엄격 만족.
 * - Wrong type 데이터 시도, as any, 타입 안전 무시 없고, missing required fields 없음.
 * - TestValidator.equals 와 TestValidator.error 모두 title 정확하게 포함.
 * - Null/undefined 케이스 논리 오류 없음. business rule, workflow 에 따름.
 * - Revise checklist 및 rules 모두 충족.
 *
 * 특별한 컴파일 오류/금지사항 없음. 최종 코드 Production Ready.
 *
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
 *   - O All TestValidator.* calls include required title
 *   - O No compilation errors
 */
const __revise = {};
__revise;
