import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceFavoritesProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceFavoritesProduct";
import { IAiCommercePageIFavoritesProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommercePageIFavoritesProduct";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * 관리자 전체 유저의 즐겨찾기 상품 리스트 검색 (페이징, 정렬, 필터)
 *
 * 이 엔드포인트는 플랫폼의 모든 즐겨찾기 상품(ai_commerce_favorites_products) 레코드에 대해 검색, 페이징, 정렬,
 * 필터 기능을 제공합니다. 어드민 인증(context admin: AdminPayload)이 필요하며, 입력 파라미터는
 * IAiCommerceFavoritesProduct.IRequest 타입으로 전달됩니다. soft delete(deleted_at:
 * null) 만 반환하며, product_id, label, folder_id, created_from, created_to 등 다양한
 * 조건으로 결과 페이징이 가능합니다. 오직 테이블에 실제 존재하는 컬럼만 where/filter 및 정렬에 사용합니다. (절대 임의
 * 필드/관계 안씀) 날짜/datetime 값은 모두 string & tags.Format<'date-time'> 타입으로 변환합니다.
 * label, folder_id는 nullable + optional이므로 null일 경우 undefined로 변환합니다.
 * limit/page는 1이상 100이하로 range clamp, 불량 input 차단, sort는 허용 필드만 적용 반환 타입은
 * IAiCommercePageIFavoritesProduct.ISummary exact structure
 *
 * @param props
 *
 *   - Admin: AdminPayload (인증된 관리자)
 *   - Body: IAiCommerceFavoritesProduct.IRequest (검색, 페이징, 정렬 파라미터)
 *
 * @returns IAiCommercePageIFavoritesProduct.ISummary (요청 페이징 범위 내 즐겨찾기 상품
 *   summary 리스트)
 * @throws {Error} 인증 오류, 파라미터 오류, DB조회 실패
 */
export async function patchaiCommerceAdminFavoritesProducts(props: {
  admin: AdminPayload;
  body: IAiCommerceFavoritesProduct.IRequest;
}): Promise<IAiCommercePageIFavoritesProduct.ISummary> {
  const { body } = props;
  // page는 1기본, limit은 20기본, 1~100 clamp, int32 태그 제거
  let page = Number(body.page ?? 1);
  if (!Number.isFinite(page) || page < 1) page = 1;
  let limit = Number(body.limit ?? 20);
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;
  const skip = (page - 1) * limit;

  // 정렬 가능 필드: created_at, label
  const allowedSortFields = ["created_at", "label"] as const;
  const rawSort = body.sort ?? "";
  const sortField = allowedSortFields.includes(
    rawSort as (typeof allowedSortFields)[number],
  )
    ? rawSort
    : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // where 조건 구성
  const where: Record<string, unknown> = { deleted_at: null };
  if (body.product_id != null) where.product_id = body.product_id;
  if (body.label != null) where.label = body.label;
  if (body.folder_id != null) where.folder_id = body.folder_id;
  if (body.created_from != null || body.created_to != null) {
    where.created_at = {
      ...(body.created_from != null && { gte: body.created_from }),
      ...(body.created_to != null && { lte: body.created_to }),
    };
  }

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_favorites_products.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
      select: {
        id: true,
        product_id: true,
        label: true,
        folder_id: true,
        snapshot_id: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.ai_commerce_favorites_products.count({ where }),
  ]);

  return {
    total: total as number & tags.Type<"int32">,
    page: page as number & tags.Type<"int32">,
    limit: limit as number & tags.Type<"int32">,
    data: rows.map((row) => ({
      id: row.id,
      product_id: row.product_id,
      label: row.label === null ? undefined : row.label,
      folder_id: row.folder_id === null ? undefined : row.folder_id,
      snapshot_id: row.snapshot_id,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
    })),
  };
}
