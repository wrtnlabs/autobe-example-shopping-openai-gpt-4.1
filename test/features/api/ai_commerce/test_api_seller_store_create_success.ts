import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSeller";
import type { IAiCommerceSellerProfiles } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceSellerProfiles";
import type { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

/**
 * 판매자의 신규 스토어 정상 등록 플로우 E2E 테스트.
 *
 * 1. 판매자가 회원가입(/auth/seller/join)
 * 2. 가입된 ID로 seller profile 생성(/aiCommerce/seller/sellerProfiles)
 * 3. 생성된 seller_profile_id, owner_user_id, store_name, store_code,
 *    approval_status로 스토어 등록 시도(/aiCommerce/seller/stores)
 * 4. 생성된 스토어의 owner_user_id, seller_profile_id, store_name, store_code가 요청값과
 *    일치하는지 검증
 * 5. 각 단계 응답에 대해 typia.assert()를 활용한 타입 유효성 검증
 */
export async function test_api_seller_store_create_success(
  connection: api.IConnection,
) {
  // 1. 판매자 회원가입 (auth/seller/join)
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const sellerJoinBody = {
    email,
    password,
  } satisfies IAiCommerceSeller.IJoin;
  const sellerAuth = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);

  // 2. 판매자 프로필 생성 (aiCommerce/seller/sellerProfiles)
  const displayName = RandomGenerator.name();
  const sellerProfileBody = {
    user_id: sellerAuth.id,
    display_name: displayName,
    approval_status: "active",
  } satisfies IAiCommerceSellerProfiles.ICreate;
  const sellerProfile =
    await api.functional.aiCommerce.seller.sellerProfiles.create(connection, {
      body: sellerProfileBody,
    });
  typia.assert(sellerProfile);

  // 3. 스토어 생성 (aiCommerce/seller/stores)
  const storeName = RandomGenerator.name();
  const storeCode = RandomGenerator.alphaNumeric(10);
  const storeBody = {
    owner_user_id: sellerAuth.id,
    seller_profile_id: sellerProfile.id,
    store_name: storeName,
    store_code: storeCode,
    approval_status: "active",
  } satisfies IAiCommerceStores.ICreate;
  const store = await api.functional.aiCommerce.seller.stores.create(
    connection,
    { body: storeBody },
  );
  typia.assert(store);

  // 4. 생성된 스토어 정보 검증
  TestValidator.equals(
    "스토어 owner_user_id 일치",
    store.owner_user_id,
    storeBody.owner_user_id,
  );
  TestValidator.equals(
    "스토어 seller_profile_id 일치",
    store.seller_profile_id,
    storeBody.seller_profile_id,
  );
  TestValidator.equals(
    "스토어 이름 일치",
    store.store_name,
    storeBody.store_name,
  );
  TestValidator.equals(
    "스토어 코드 일치",
    store.store_code,
    storeBody.store_code,
  );
  TestValidator.equals(
    "스토어 승인 상태 일치",
    store.approval_status,
    storeBody.approval_status,
  );
}

/**
 * - 코드 전체적으로, 요구된 시나리오의 모든 필수 단계가 올바른 순서로 구현됨
 * - 테스트 데이터 생성에 typia.random, RandomGenerator.alphaNumeric, RandomGenerator.name
 *   등 각종 툴을 적절히 활용함 (제약 및 최적 타입도 준수)
 * - 모든 API 호출에 await이 빠짐없이 포함되어 있음
 * - IAiCommerceSeller.IJoin → IAuthorized → sellerProfile (id) →
 *   IAiCommerceStores.ICreate 흐름을 올바르게 탑재 (owner_user_id/seller_profile_id의 데이터
 *   연결 실수 없음)
 * - 각 요청/응답에 대해 typia.assert로 강력한 타입 검증을 진행함
 * - TestValidator.equals에서 title(비교 타이틀) 1번째 파라미터 정확히 명시됨
 * - 무의미하거나 비효율적인 검증문 또는 비즈니스 흐름에 어긋나는 단계 없음
 * - 코드 내 NO import 추가, ZERO type error testing, DTO 속성/네이밍 일치 등 주요 금지사항 미준수 없음
 * - 불필요한 null/undefined 체크 및 잘못된 non-null assertion 없음
 * - 특별히 고칠 점 없음. 이대로 production 적용해도 좋음.
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
 *   - O 4.5. Typia Tag Type Conversion (When Encountering Type Mismatches)
 *   - O 4.6. Request Body Variable Declaration Guidelines
 *   - O 4.7. Date Handling in DTOs
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.7.2. Business Logic Validation Patterns
 *   - O 4.7.3. Data Consistency Patterns
 *   - O 4.7.4. Error Scenario Patterns
 *   - O 4.7.5. Best Practices Summary
 *   - O 4.8. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.10. CRITICAL: AI Must Generate TypeScript Code, NOT Markdown Documents
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O Function follows correct naming convention and structure
 *   - O Template untouched except function content
 *   - O All TestValidator.* functions use title as first parameter
 *   - O All DTO types in API calls are correct request/response variants
 *   - O No type error validation or type confusion
 *   - O Proper async/await usage in all API and TestValidator.error calls
 */
const __revise = {};
__revise;
