import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStores";
import { IPageIAiCommerceStores } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceStores";
import { SellerPayload } from "../decorators/payload/SellerPayload";

/**
 * 검색 및 필터를 지원하는 셀러 스토어 리스트 조회 (페이징/정렬/검색)
 *
 * 이 엔드포인트는 인증된 셀러의 ai_commerce_stores 목록을 검색 조건(스토어명, 코드, 상태, 프로필 PK 등),
 * 페이징(page/limit), 정렬(sort/order), 전체 갯수 집계와 함께 반환합니다. 셀러 자격 인증이 반드시 필요하며, 본인이
 * 소유한 스토어만 조회 가능합니다.
 *
 * @param props - Seller: SellerPayload - JWT로 인증된 셀러 정보 (ai_commerce_buyer.id
 *   사용) body: IAiCommerceStores.IRequest - 검색, 필터, 페이징, 정렬 조건
 * @returns IPageIAiCommerceStores.ISummary - 페이징 정보와 필터링된 스토어 목록
 * @throws {Error} 인증 누락, business rule 위반 등
 */
export async function patchaiCommerceSellerStores(props: {
  seller: SellerPayload;
  body: IAiCommerceStores.IRequest;
}): Promise<IPageIAiCommerceStores.ISummary> {
  const { seller, body } = props;

  // 페이지/페이지당 수 클램핑 및 입력값 안전 변환
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  // 허용된 정렬 컬럼만 사용(Injection 방지)
  const allowedSortFields = [
    "created_at",
    "updated_at",
    "store_name",
    "approval_status",
    "store_code",
  ];
  const sortField = allowedSortFields.includes(body.sort ?? "")
    ? (body.sort ?? "created_at")
    : "created_at";
  const sortOrder = body.order === "asc" ? "asc" : "desc";

  // 검색 조건 구성 (owner_user_id 무조건 seller.id)
  const where = {
    owner_user_id: seller.id,
    deleted_at: null,
    ...(body.store_name !== undefined &&
      body.store_name !== null && {
        store_name: { contains: body.store_name },
      }),
    ...(body.store_code !== undefined &&
      body.store_code !== null && {
        store_code: { contains: body.store_code },
      }),
    ...(body.approval_status !== undefined &&
      body.approval_status !== null && {
        approval_status: body.approval_status,
      }),
    ...(body.seller_profile_id !== undefined &&
      body.seller_profile_id !== null && {
        seller_profile_id: body.seller_profile_id,
      }),
  };

  // 동시 쿼리: 리스트 + 전체 카운트
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_stores.findMany({
      where,
      orderBy: { [sortField]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_stores.count({ where }),
  ]);

  // 결과 shape 변환+date포맷, 삭제일자 null/undefined 정확히 처리
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / Number(limit)),
    },
    data: rows.map((row) => ({
      id: row.id,
      store_name: row.store_name,
      store_code: row.store_code,
      approval_status: row.approval_status,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      deleted_at: row.deleted_at ? toISOStringSafe(row.deleted_at) : undefined,
    })),
  };
}
