import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IShoppingMallAiBackendCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAiBackendCouponIssuance";
import { IPageIShoppingMallAiBackendCouponIssuance } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAiBackendCouponIssuance";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * 검색: 관리자 쿠폰 캠페인별 발급 내역(issued coupon)
 *
 * 이 엔드포인트는 특정 couponId에 속하는 모든 쿠폰 발급 이력을 필터링, 페이징, 정렬하여 반환합니다. 어드민 인증 기반으로 필수
 * 권한을 검증합니다. 반환값은 주요 summary 필드/연관 고객 참조, 페이지네이션 정보를 포함합니다.
 *
 * @param props - 인증된 어드민, 쿠폰Id, 상세 필터링/페이징 입력
 * @param props.admin - 관리자로 로그인한 사용자의 인증 페이로드
 * @param props.couponId - 발급 내역을 검색할 쿠폰 정책 UUID
 * @param props.body - 발급 상태, 고객UUID, 기간, 페이지/갯수 등 검색 옵션
 * @returns 페이징/정렬된 발급 이력 목록 및 pagination 정보 반환
 * @throws {Error} 어드민 미인증, 쿠폰 미존재, DB 오류시
 */
export async function patch__shoppingMallAiBackend_admin_coupons_$couponId_issuances(props: {
  admin: AdminPayload;
  couponId: string & tags.Format<"uuid">;
  body: IShoppingMallAiBackendCouponIssuance.IRequest;
}): Promise<IPageIShoppingMallAiBackendCouponIssuance.ISummary> {
  const { admin, couponId, body } = props;
  // 1. Authorization (중복 인증 방지: 가급적 실DB 인증 필요)
  const adminCheck =
    await MyGlobal.prisma.shopping_mall_ai_backend_admins.findFirst({
      where: { id: admin.id, is_active: true, deleted_at: null },
    });
  if (!adminCheck)
    throw new Error("Unauthorized: Admin is not active or does not exist");

  // 2. 쿠폰 정책 존재 여부 확인
  const coupon =
    await MyGlobal.prisma.shopping_mall_ai_backend_coupons.findFirst({
      where: { id: couponId, deleted_at: null },
    });
  if (!coupon) throw new Error("Coupon not found");

  // 3. 필터/페이지 입력 처리
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;

  // 4. 조건(where) 동적 생성
  const where = {
    shopping_mall_ai_backend_coupon_id: couponId,
    ...(body.status !== undefined &&
      body.status !== null && { status: body.status }),
    ...(body.shopping_mall_ai_backend_customer_id !== undefined &&
      body.shopping_mall_ai_backend_customer_id !== null && {
        shopping_mall_ai_backend_customer_id:
          body.shopping_mall_ai_backend_customer_id,
      }),
    ...(((body.issued_at_from !== undefined && body.issued_at_from !== null) ||
      (body.issued_at_to !== undefined && body.issued_at_to !== null)) && {
      issued_at: {
        ...(body.issued_at_from !== undefined &&
          body.issued_at_from !== null && { gte: body.issued_at_from }),
        ...(body.issued_at_to !== undefined &&
          body.issued_at_to !== null && { lte: body.issued_at_to }),
      },
    }),
  };

  // 5. 데이터 조회 및 카운트(동시)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_ai_backend_coupon_issuances.findMany({
      where,
      orderBy: { issued_at: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    MyGlobal.prisma.shopping_mall_ai_backend_coupon_issuances.count({ where }),
  ]);

  // 6. 출력 데이터 매핑 및 브랜딩
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total as number & tags.Type<"int32">,
      pages: Math.ceil(total / Number(limit)) as number & tags.Type<"int32">,
    },
    data: Array.isArray(rows)
      ? rows.map((row) => ({
          id: row.id as string & tags.Format<"uuid">,
          shopping_mall_ai_backend_coupon_id:
            row.shopping_mall_ai_backend_coupon_id as string &
              tags.Format<"uuid">,
          shopping_mall_ai_backend_customer_id:
            row.shopping_mall_ai_backend_customer_id ?? null,
          status: row.status,
          issued_at: toISOStringSafe(row.issued_at),
          used_at: row.used_at ? toISOStringSafe(row.used_at) : null,
          revoked_at: row.revoked_at ? toISOStringSafe(row.revoked_at) : null,
        }))
      : [],
  };
}
