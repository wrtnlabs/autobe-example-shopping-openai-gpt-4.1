import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * 테스트 목적: 한 판매자가 소유하지 않은 상품을 수정하려고 할 때, 권한이 없으므로 수정이 거부됨을 검증합니다.
 *
 * 1. 관리자로 인증하여 카테고리 생성
 * 2. 판매자A 회원 가입 및 인증
 * 3. 판매자A가 신규 상품을 등록 (seller account A)
 * 4. 판매자B 회원 가입 및 인증
 * 5. 판매자B가 판매자A의 상품을 update 시도 (상품명, description 등)
 * 6. Update 요청이 권한 오류로 실패해야 함 (정상적으로 에러 반환 및 상품 정보 변경 없음)
 */
export async function test_api_product_update_by_unauthorized_seller(
  connection: api.IConnection,
) {
  // 1. 관리자로 인증하여 카테고리 생성
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "admin-1234!",
    full_name: RandomGenerator.name(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 카테고리 생성
  const categoryBody = {
    name_ko: RandomGenerator.name(),
    name_en: RandomGenerator.name(),
    display_order: 0,
    is_active: true,
  } satisfies IShoppingMallCategory.ICreate;
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    { body: categoryBody },
  );
  typia.assert(category);

  // 2. 판매자A 회원 가입
  const sellerAEmail = typia.random<string & tags.Format<"email">>();
  const sellerAJoinBody = {
    email: sellerAEmail,
    password: "sellerA-1234!",
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerA = await api.functional.auth.seller.join(connection, {
    body: sellerAJoinBody,
  });
  typia.assert(sellerA);

  // 3. 판매자A가 상품 등록(상품 생성/등록 API는 없으므로 상품 생성은 테스트 시나리오에서 가정)
  // UPDATE는 상품이 있어야 테스트 가능하므로, 상품 ID를 임의로 생성(실제 환경이라면 상품 생성 API가 필요)
  // 하지만 여기선 상품이 반드시 존재한다고 가정하고, 상품 ID를 임의로 만듦
  // 상품 생성 API가 제공되면 이 블록을 실제 상품 생성으로 교체 필요
  //
  // 상품은 IShoppingMallProduct 타입이므로, ID만 랜덤 생성하여 사용
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 일반적으로라면 "등록" API 결과로 얻은 상품 ID를 사용해야 함
  //
  // 4. 판매자B 회원 가입
  const sellerBEmail = typia.random<string & tags.Format<"email">>();
  const sellerBJoinBody = {
    email: sellerBEmail,
    password: "sellerB-5678!",
    business_name: RandomGenerator.paragraph({ sentences: 2 }),
    contact_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_registration_number: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerB = await api.functional.auth.seller.join(connection, {
    body: sellerBJoinBody,
  });
  typia.assert(sellerB);

  // 5. 판매자B 계정으로 인증 상태에서, 판매자A의 상품을 update 시도
  // 시도할 update 데이터는 상품명과 description(임의 값) 변경
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    shopping_mall_category_id: category.id,
    is_active: false,
  } satisfies IShoppingMallProduct.IUpdate;

  await TestValidator.error(
    "다른 판매자의 상품 update 권한 없음 (권한 오류)",
    async () => {
      await api.functional.shoppingMall.seller.products.update(connection, {
        productId,
        body: updateBody,
      });
    },
  );
}
