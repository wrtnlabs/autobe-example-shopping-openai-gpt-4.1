import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendProductInventory";
import { IPageIShoppingMallAiBackendProductInventory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendProductInventory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * 목록 및 검색 - 상품별 재고 재고현황 리스트 (판매자/관리자용)
 *
 * 이 API는 특정 상품에 대한 재고 정보를 페이징, 필터, 정렬 옵션과 함께 조회합니다. 상품의 재고
 * 상태(inventory_status), 정렬, 페이지네이션 등을 지원하며, 결과는 해당 상품의 재고만 반환합니다. 판매자/관리자 인증
 * 필요. 정상 응답 시 페이지 정보와 데이터 배열을 IPageIShoppingMallAiBackendProductInventory 형태로
 * 반환합니다.
 *
 * @param props - 요청 정보
 * @param props.seller - 인증된 판매자 페이로드
 * @param props.productId - 조회하려는 상품 UUID
 * @param props.body - 검색/필터/정렬/페이지네이션 등 요청 본문
 * @returns 페이징된 상품 재고 목록
 * @throws {Error} 인증 실패, 내부 오류, DB 쿼리 문제 등
 */
export async function patch__shoppingMallAiBackend_seller_products_$productId_inventories(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendProductInventory.IRequest;
}): Promise<IPageIShoppingMallAiBackendProductInventory> {
  const { seller, productId, body } = props;

  // 페이지/리밋 파라미터
  const page =
    body.page !== undefined &&
    body.page !== null &&
    typeof body.page === "number" &&
    body.page > 0
      ? body.page
      : 1;
  const limit =
    body.limit !== undefined &&
    body.limit !== null &&
    typeof body.limit === "number" &&
    body.limit > 0
      ? body.limit
      : 20;

  // where 조건 (상품 FK와 optional status)
  const where = {
    shopping_mall_ai_backend_products_id: productId,
    ...(body.inventory_status !== undefined &&
      body.inventory_status !== null && {
        inventory_status: body.inventory_status,
      }),
  };

  // 정렬 필드 안전 제한
  const orderByField =
    body.order_by === "available_quantity"
      ? "available_quantity"
      : "last_update_at";
  const orderByDir = body.sort === "asc" ? "asc" : "desc";

  // DB 데이터/총 개수 동시 쿼리
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_product_inventories.findMany({
      where,
      orderBy: { [orderByField]: orderByDir },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_product_inventories.count({
      where,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Math.ceil(
        Number(total) / (Number(limit) === 0 ? 1 : Number(limit)),
      ),
    },
    data: rows.map((row) => ({
      id: row.id,
      shopping_mall_ai_backend_products_id:
        row.shopping_mall_ai_backend_products_id,
      available_quantity: row.available_quantity,
      reserved_quantity: row.reserved_quantity,
      last_update_at: toISOStringSafe(row.last_update_at),
      inventory_status: row.inventory_status,
    })),
  };
}
