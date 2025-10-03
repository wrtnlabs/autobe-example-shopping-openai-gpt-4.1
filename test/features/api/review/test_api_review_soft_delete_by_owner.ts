import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAfterSaleService } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAfterSaleService";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallChannel } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannel";
import type { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDelivery";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";

/**
 * 상품 리뷰 소프트 삭제(논리 삭제) 기능의 올바른 동작 검증
 *
 * 1. 쇼핑몰 채널 등록(관리자)
 * 2. 섹션/카테고리 등록(관리자)
 * 3. 고객 회원가입 및 계정 획득
 * 4. 판매자 상품 등록(샘플 - 관리자가 seller라고 가정하고 진행)
 * 5. 고객 장바구니 생성(상품/섹션/채널 기반)
 * 6. 관리자 주문 생성(카트, 상품 기준)
 * 7. 고객 권한으로 리뷰 생성(상품/주문 기반)
 * 8. 리뷰 소프트 삭제(본인 고객 권한)
 * 9. 리뷰 정보 재조회: deleted_at이 null아님을 확인, 기본 사용자 조회에선 빠질 것으로 간주
 * 10. 이미 삭제된 리뷰 반복 삭제 시도: 비즈니스 에러 발생함을 확인
 */
export async function test_api_review_soft_delete_by_owner(
  connection: api.IConnection,
) {
  // 1. 쇼핑몰 채널 생성(관리자)
  const channel = await api.functional.shoppingMall.admin.channels.create(
    connection,
    {
      body: {
        code: RandomGenerator.name(1),
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(channel);

  // 2. 섹션 생성(관리자)
  const section =
    await api.functional.shoppingMall.admin.channels.sections.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          code: RandomGenerator.name(1),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        },
      },
    );
  typia.assert(section);

  // 3. 카테고리 생성(관리자)
  const category =
    await api.functional.shoppingMall.admin.channels.categories.create(
      connection,
      {
        channelId: channel.id,
        body: {
          shopping_mall_channel_id: channel.id,
          parent_id: null,
          code: RandomGenerator.name(1),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        },
      },
    );
  typia.assert(category);

  // 4. 고객 회원가입 및 인증 토큰 획득
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer = await api.functional.auth.customer.join(connection, {
    body: {
      shopping_mall_channel_id: channel.id,
      email: customerEmail,
      password: "TestPass1234",
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    },
  });
  typia.assert(customer);

  // 5. 상품 등록
  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        shopping_mall_seller_id: typia.random<string & tags.Format<"uuid">>(), // 테스트용 임의 seller
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_category_id: category.id,
        code: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.paragraph({ sentences: 2 }),
        status: "Active",
        business_status: "Approval",
      },
    },
  );
  typia.assert(product);

  // 6. 고객 장바구니 생성
  const cart = await api.functional.shoppingMall.customer.carts.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        source: "member",
      },
    },
  );
  typia.assert(cart);

  // 7. 주문 생성(관리자 권한)
  const order = await api.functional.shoppingMall.admin.orders.create(
    connection,
    {
      body: {
        shopping_mall_customer_id: customer.id,
        shopping_mall_channel_id: channel.id,
        shopping_mall_section_id: section.id,
        shopping_mall_cart_id: cart.id,
        order_type: "normal",
        total_amount: 10000,
        currency: "KRW",
        order_items: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(), // 실제로는 시스템에서 부여되겠으나 테스트에서는 랜덤
            shopping_mall_product_id: product.id,
            shopping_mall_seller_id: product.shopping_mall_seller_id,
            quantity: 1,
            unit_price: 10000,
            final_price: 10000,
            status: "ordered",
          },
        ],
        deliveries: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            recipient_name: customer.name,
            recipient_phone: customer.phone ?? RandomGenerator.mobile(),
            address_snapshot: RandomGenerator.paragraph({ sentences: 2 }),
            delivery_status: "prepared",
            delivery_attempts: 1,
          },
        ],
        payments: [
          {
            shopping_mall_order_id: typia.random<
              string & tags.Format<"uuid">
            >(),
            shopping_mall_customer_id: customer.id,
            payment_type: "card",
            status: "paid",
            amount: 10000,
            currency: "KRW",
            requested_at: new Date().toISOString(),
          },
        ],
        after_sale_services: [],
      },
    },
  );
  typia.assert(order);

  // 8. 리뷰 생성(고객 권한)
  const review = await api.functional.shoppingMall.customer.reviews.create(
    connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order.id,
        rating: 5,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        body: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(review);

  // 9. 리뷰 소프트 삭제 수행(고객 자신이 직접 삭제)
  await api.functional.shoppingMall.customer.reviews.erase(connection, {
    reviewId: review.id,
  });

  // 10. 리뷰 재조회: deleted_at 값 null이 아닌지(실제로 조회 API는 없으나 내부 적정 조회로 판단, 여기서는 타입 검증만)
  // typia.assert(review); // 이미 소프트 삭제 상태. 실제 API에서 리스트 조회시 나오지 않아야 함(리스트 기능은 미제공이므로 직접 검증 불가)

  // 11. 동일 리뷰 반복 삭제 시도 → 에러 발생
  await TestValidator.error("이미 삭제된 리뷰는 다시 삭제 불가", async () => {
    await api.functional.shoppingMall.customer.reviews.erase(connection, {
      reviewId: review.id,
    });
  });
}
