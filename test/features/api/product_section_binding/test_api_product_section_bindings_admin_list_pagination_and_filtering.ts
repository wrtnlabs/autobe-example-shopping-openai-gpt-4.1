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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIAiCommerceProductSectionBinding } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceProductSectionBinding";

/**
 * 관리자가 특정 상품의 섹션 바인딩 리스트를 페이징/정렬/필터 옵션으로 검색하는 시나리오.
 *
 * 1. Admin 계정 생성 및 로그인 (관리자 인증 획득)
 * 2. Seller 계정 생성 및 로그인 (판매자 인증 획득)
 * 3. Seller 상품 생성(직접 seller 권한으로 상품 생성 필요)
 * 4. Admin 계정으로 채널 생성 후 섹션 2개 이상 생성
 * 5. Seller 계정으로 상품-섹션 바인딩 여러 개 등록(서로 다른 section에 묶기)
 * 6. Admin 계정으로 재접속
 * 7. PATCH /aiCommerce/admin/products/{productId}/sectionBindings 엔드포인트를 다양한
 *    필터/정렬/페이징 조합, section_id 포함 등으로 여러번 호출
 * 8. 각 요청에서 반환되는 바인딩 리스트가 필터와 페이징/정렬 옵션 기준에 부합하는지, paging 정보가 맞는지, 전체 바인딩 수와도
 *    일치하는지 검증, 또한 정렬을 asc/desc로 변경하면 결과 순서도 달라지는지 확인
 */
export async function test_api_product_section_bindings_admin_list_pagination_and_filtering(
  connection: api.IConnection,
) {
  // 1. Admin 계정 생성 및 로그인
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      status: "active",
    } satisfies IAiCommerceAdmin.IJoin,
  });
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 2. Seller 계정 생성 및 로그인
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphabets(10);
  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.IJoin,
  });
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });

  // 3. Seller 상품 생성
  const storeId = typia.random<string & tags.Format<"uuid">>();
  const product = await api.functional.aiCommerce.seller.products.create(
    connection,
    {
      body: {
        seller_id: typia.random<string & tags.Format<"uuid">>(), // 실제 seller id는 응답값 등으로 받을 수 있을 때 맞게 처리
        store_id: storeId,
        product_code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        status: "active",
        business_status: "normal",
        current_price: 9900,
        inventory_quantity: 50,
      } satisfies IAiCommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Admin 계정 재로그인 및 채널/섹션 2개 이상 생성
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });
  const channel = await api.functional.aiCommerce.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(6),
        name: RandomGenerator.name(2),
        locale: "ko-KR",
        is_active: true,
        business_status: "normal",
      } satisfies IAiCommerceChannel.ICreate,
    },
  );
  typia.assert(channel);
  const section1 =
    await api.functional.aiCommerce.admin.channels.sections.create(connection, {
      channelId: channel.id,
      body: {
        ai_commerce_channel_id: channel.id,
        code: "sec1" + RandomGenerator.alphaNumeric(4),
        name: RandomGenerator.name(1),
        is_active: true,
        business_status: "normal",
        sort_order: 1,
      } satisfies IAiCommerceSection.ICreate,
    });
  const section2 =
    await api.functional.aiCommerce.admin.channels.sections.create(connection, {
      channelId: channel.id,
      body: {
        ai_commerce_channel_id: channel.id,
        code: "sec2" + RandomGenerator.alphaNumeric(4),
        name: RandomGenerator.name(1),
        is_active: true,
        business_status: "normal",
        sort_order: 2,
      } satisfies IAiCommerceSection.ICreate,
    });
  typia.assert(section1);
  typia.assert(section2);
  // 5. Seller 계정 재로그인 후 상품-섹션 바인딩 여러 개 등록
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IAiCommerceSeller.ILogin,
  });
  const binding1 =
    await api.functional.aiCommerce.seller.products.sectionBindings.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          section_id: section1.id,
          display_order: 10,
        } satisfies IAiCommerceProductSectionBinding.ICreate,
      },
    );
  const binding2 =
    await api.functional.aiCommerce.seller.products.sectionBindings.create(
      connection,
      {
        productId: product.id,
        body: {
          product_id: product.id,
          section_id: section2.id,
          display_order: 20,
        } satisfies IAiCommerceProductSectionBinding.ICreate,
      },
    );
  typia.assert(binding1);
  typia.assert(binding2);

  // 6. Admin 계정 재로그인
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IAiCommerceAdmin.ILogin,
  });

  // 7. PATCH /aiCommerce/admin/products/{productId}/sectionBindings 페이징/정렬/필터 테스트
  // 기본조회 (full list, default sort, default page)
  const pageResFull =
    await api.functional.aiCommerce.admin.products.sectionBindings.index(
      connection,
      {
        productId: product.id,
        body: {},
      },
    );
  typia.assert(pageResFull);
  TestValidator.equals("전체 바인딩 반환 수 확인", pageResFull.data.length, 2);

  // section_id로 필터(1번 섹션)
  const pageResSection1 =
    await api.functional.aiCommerce.admin.products.sectionBindings.index(
      connection,
      {
        productId: product.id,
        body: { section_id: section1.id },
      },
    );
  TestValidator.equals("section1 only 필터", pageResSection1.data.length, 1);
  TestValidator.equals(
    "section1 id 매칭",
    pageResSection1.data[0].section_id,
    section1.id,
  );

  // 정렬 테스트 (display_order asc)
  const pageResAsc =
    await api.functional.aiCommerce.admin.products.sectionBindings.index(
      connection,
      {
        productId: product.id,
        body: { sort_by: "display_order", sort_order: "asc" },
      },
    );
  TestValidator.equals("asc 정렬 1번", pageResAsc.data[0].display_order, 10);

  // 정렬 테스트 (display_order desc)
  const pageResDesc =
    await api.functional.aiCommerce.admin.products.sectionBindings.index(
      connection,
      {
        productId: product.id,
        body: { sort_by: "display_order", sort_order: "desc" },
      },
    );
  TestValidator.equals("desc 정렬 1번", pageResDesc.data[0].display_order, 20);

  // 페이징 limit/page 조합 테스트 (limit=1, page=2)
  const pageResPage2 =
    await api.functional.aiCommerce.admin.products.sectionBindings.index(
      connection,
      {
        productId: product.id,
        body: {
          limit: 1 as number & tags.Type<"int32">,
          page: 2 as number & tags.Type<"int32">,
        },
      },
    );
  TestValidator.equals(
    "limit=1, page=2이면 2번째 바인딩 1개",
    pageResPage2.data.length,
    1,
  );
  TestValidator.equals(
    "2번째 바인딩 display_order=20",
    pageResPage2.data[0].display_order,
    20,
  );

  // 페이징 정보 검증
  TestValidator.equals("pagination.limit=1", pageResPage2.pagination.limit, 1);
  TestValidator.equals(
    "pagination.current=2",
    pageResPage2.pagination.current,
    2,
  );
}

/**
 * - 모든 API 함수 호출에 await가 빠짐없이 붙어 있음
 * - TestValidator 함수 첫 번째 파라미터 title 누락 없음, 설명 구체적으로 포함됨
 * - DTO 타입을 정확히 맞춰서 (ICreate/IAuthorized 등) 사용
 * - Connection.headers 조작 없음
 * - 랜덤 생성자/유효 uuid/문자열 생성 등 타입태그 준수
 * - RequestBody는 const로 선언, satisfies 패턴 적용
 * - API 응답에 typia.assert 검증 적용됨
 * - 페이징/정렬/필터 등 다양한 옵션 실제로 호출, 결과 검증
 * - 잘못된 타입값 or 누락 필드 없음
 * - Markdown/docstring 없이 타입스크립트 코드만 출력
 * - Draft와 달라질 점 없음 (오류 없음)
 * - Rules
 *
 *   - O 1. Role and Responsibility
 *   - O 2. Input Materials Provided
 *   - O 3. Code Generation Requirements
 *   - O 3.1. Import Management
 *   - O 3.3. API Response and Request Type Checking
 *   - O 3.7. Logic Validation and Assertions
 *   - O 4.4. Documentation
 *   - O 5. Final Checklist
 * - Check List
 *
 *   - O NO additional import statements
 *   - O NO wrong type data in requests
 *   - O EVERY api.functional.* call has await
 *   - O CRITICAL: All TestValidator functions include descriptive title as FIRST
 *       parameter
 *   - O DTO type precision - Using correct DTO variant for each operation
 *   - O NO headers manipulation
 *   - O NO missing required fields
 *   - O NO fictional functions/types
 *   - O NO type safety violations (`any`, `@ts-ignore`, `@ts-expect-error`)
 *   - O NO Markdown Syntax/Code blocks
 */
const __revise = {};
__revise;
