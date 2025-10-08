import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";

/**
 * 관리자가 기존 상품에 새로운 상품 옵션(예: 색상, 사이즈 등 변형 속성)을 생성할 수 있는지 테스트합니다.
 *
 * 1. 관리자로 회원가입 후 인증(token 자동 부여)
 * 2. 상품 카테고리 생성
 * 3. 해당 카테고리에 상품 등록
 * 4. 상품 옵션명 랜덤 생성 및 옵션 최초 생성 시도(정상 동작 검증)
 * 5. 생성된 옵션의 productId와 이름, display_order 등 속성을 확인
 * 6. 동일 상품에 같은 이름으로 옵션 생성 재시도 시 오류 응답 검증
 * 7. 다른 이름의 옵션을 하나 더 생성하고, display_order가 다르게 증가되었는지 검증
 */
export async function test_api_product_option_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. 관리자로 회원가입 및 인증
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminFullName = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        full_name: adminFullName,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);
  TestValidator.equals("admin email matches", admin.email, adminEmail);

  // 2. 상품 카테고리 등록
  const categoryNameKo = RandomGenerator.name(2);
  const categoryNameEn = RandomGenerator.alphabets(5) + "_cat";
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name_ko: categoryNameKo,
        name_en: categoryNameEn,
        display_order: 0,
        is_active: true,
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);
  TestValidator.equals(
    "category name ko matches",
    category.name_ko,
    categoryNameKo,
  );
  TestValidator.equals("category is active", category.is_active, true);

  // 3. 상품 등록
  const productName = RandomGenerator.paragraph({ sentences: 2 });
  const productDesc = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 10,
    sentenceMax: 15,
  });
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.admin.products.create(connection, {
      body: {
        shopping_mall_seller_id: admin.id,
        shopping_mall_category_id: category.id,
        name: productName,
        description: productDesc,
        is_active: true,
        main_image_url: undefined,
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);
  TestValidator.equals("product name matches", product.name, productName);

  // 4. 첫 옵션 생성(성공)
  const optionName = "Color";
  const displayOrder = 0 as number & tags.Type<"int32">;
  const option: IShoppingMallProductOption =
    await api.functional.shoppingMall.admin.products.options.create(
      connection,
      {
        productId: product.id,
        body: {
          name: optionName,
          display_order: displayOrder,
        } satisfies IShoppingMallProductOption.ICreate,
      },
    );
  typia.assert(option);
  TestValidator.equals("option name matches", option.name, optionName);
  TestValidator.equals(
    "option productId matches",
    option.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "option display_order is zero",
    option.display_order,
    displayOrder,
  );

  // 5. 동일 옵션명 중복 생성 시도 → 오류 발생 확인
  await TestValidator.error(
    "동일 상품에 옵션명 중복 생성시 오류 발생",
    async () => {
      await api.functional.shoppingMall.admin.products.options.create(
        connection,
        {
          productId: product.id,
          body: {
            name: optionName,
            display_order: 1 as number & tags.Type<"int32">,
          } satisfies IShoppingMallProductOption.ICreate,
        },
      );
    },
  );

  // 6. 다른 이름 두번째 옵션 생성(성공), display_order 1
  const optionName2 = "Size";
  const displayOrder2 = 1 as number & tags.Type<"int32">;
  const option2: IShoppingMallProductOption =
    await api.functional.shoppingMall.admin.products.options.create(
      connection,
      {
        productId: product.id,
        body: {
          name: optionName2,
          display_order: displayOrder2,
        } satisfies IShoppingMallProductOption.ICreate,
      },
    );
  typia.assert(option2);
  TestValidator.equals("second option name", option2.name, optionName2);
  TestValidator.equals(
    "second option display_order",
    option2.display_order,
    displayOrder2,
  );
  TestValidator.notEquals(
    "다른 옵션 id는 서로 달라야 함",
    option2.id,
    option.id,
  );
}
