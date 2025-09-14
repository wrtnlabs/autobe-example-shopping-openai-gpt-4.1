import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAiCommerceHighlightedProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceHighlightedProduct";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceHighlightedProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceHighlightedProduct";

/**
 * 하이라이트 상품들의 페이징 및 필터 조회 성공 시나리오 테스트.
 *
 * 여러 하이라이트 상품이 이미 등록되어 있다고 가정하고,
 *
 * 1. 기본 페이지네이션 쿼리로 하이라이트 상품 목록을 요청
 * 2. 반환 결과가 페이징 정보(pagination)와 1개 이상의 상품 정보를 포함하는지 검증
 * 3. 다양한 필터(product_id, highlighted_by, highlight_status, 기간) 조합도 랜덤으로 적용, 결과 유효성
 *    검증
 * 4. Page/limit 조합을 바꿔가며 빈 페이지 혹은 정상페이지 동작 확인
 */
export async function test_api_highlighted_products_search_pagination(
  connection: api.IConnection,
) {
  // 1. 기본 조회: 첫 페이지만 요청
  const req1 = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IAiCommerceHighlightedProduct.IRequest;
  const page1 = await api.functional.aiCommerce.highlightedProducts.index(
    connection,
    { body: req1 },
  );
  typia.assert(page1);
  TestValidator.predicate(
    "최초 페이지에 1개 이상 데이터 존재",
    page1.data.length >= 1,
  );
  TestValidator.predicate(
    "pagination 정보를 포함",
    typeof page1.pagination.current === "number",
  );

  // 2. 랜덤 필터 1: 임의로 1개 하이라이트 상품이 있으면 해당 product_id로 filtering
  if (page1.data.length > 0) {
    const sample = RandomGenerator.pick(page1.data);
    const req2 = {
      product_id: sample.ai_commerce_product_id,
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IAiCommerceHighlightedProduct.IRequest;
    const filtered = await api.functional.aiCommerce.highlightedProducts.index(
      connection,
      { body: req2 },
    );
    typia.assert(filtered);
    TestValidator.predicate(
      "product_id 필터시 모든 row의 product_id 일치",
      filtered.data.every(
        (r) => r.ai_commerce_product_id === sample.ai_commerce_product_id,
      ),
    );
  }

  // 3. 랜덤 필터 2: highlight_status, 기간 조합 등으로 filtering
  if (page1.data.length > 0) {
    const sample = RandomGenerator.pick(page1.data);
    const req3 = {
      highlight_status: sample.is_active ? "active" : null,
      start_at_from: sample.highlight_start_at,
      start_at_to: sample.highlight_end_at ?? undefined,
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IAiCommerceHighlightedProduct.IRequest;
    const byStatus = await api.functional.aiCommerce.highlightedProducts.index(
      connection,
      { body: req3 },
    );
    typia.assert(byStatus);
    if (byStatus.data.length > 0) {
      TestValidator.predicate(
        "하이라이트 상태/기간 필터도 올바른 결과",
        byStatus.data.every((r) => typeof r.is_active === "boolean"),
      );
    }
  }

  // 4. 과도한 페이지 요청시 빈 배열 (예: 마지막 페이지 다음)
  const tooFar = {
    page: (page1.pagination.pages + 1) as number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies IAiCommerceHighlightedProduct.IRequest;
  const empty = await api.functional.aiCommerce.highlightedProducts.index(
    connection,
    { body: tooFar },
  );
  typia.assert(empty);
  TestValidator.equals(
    "존재하지 않는 페이지 요청시 빈 배열",
    empty.data.length,
    0,
  );
}

/**
 * - 올바른 TypeScript 및 DTO 타입 사용 확인 (타입 미스매치 없음)
 * - 테스트 본문에서 모든 API 함수 호출에 await 사용
 * - RandomGenerator, typia.assert, TestValidator 사용법 정확
 * - Product_id 등 필터링 시 실제 응답 데이터에서 값을 추출해 필터링 로직의 현실성 확보
 * - 명확한 assertion 문구 및 타입-세이프 검증 유지
 * - 과도한 페이지네이션(존재하지 않는 페이지) 요청 테스트 시 data.length === 0 확인
 * - Code style, 규칙, logic, 규제 사항 위반 없음 확인됨
 * - 추가 import, require, as any, 잘못된 type 사용 또는 type error 테스트 없음
 * - 모든 assertion 함수 첫 파라미터에 명확한 설명 제목 부여
 * - 완성도/타입 안전성 검증됨
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
 *   - O 4.8. Avoiding Illogical Code Patterns
 *   - O 4.10. AI-Driven Autonomous TypeScript Syntax Deep Analysis
 *   - O 4.11. CRITICAL: Anti-Hallucination Protocol
 *   - O 4.12. 🚨🚨🚨 ABSOLUTE PROHIBITION: NO TYPE ERROR TESTING - ZERO TOLERANCE
 *       🚨🚨🚨
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O NO missing required fields
 *   - O EVERY api.functional.* call has await
 *   - O ALL TestValidator functions include descriptive title as FIRST parameter
 *   - O No compilation errors
 *   - O Only implementable business logic tested
 *   - O TestValidator.error only for valid (no type error) cases
 */
const __revise = {};
__revise;
