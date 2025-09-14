import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceStoreBanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceStoreBanking";
import { IPageIAiCommerceStoreBanking } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceStoreBanking";
import { AdminPayload } from "../decorators/payload/AdminPayload";

/**
 * 검색 및 필터, 페이징, 마스킹된 민감 정보와 함께 관리자용 상점 은행 정보 목록 반환
 *
 * 이 함수는 ai_commerce_store_banking 테이블에서 관리자가 요청한 조건에 따라 페이징/검색된 상점 은행 계좌 목록을
 * 반환합니다. 모든 파라미터는 DTO 및 스키마에 선언된 필드만을 기반으로 필터링되며, 반환값은 정책에 따라 계좌번호/라우팅코드를
 * 마스킹합니다.
 *
 * 인증은 반드시 AdminPayload로 수행되며, 결과 데이터는 실무 준수 요구에 따라 적절히 가공됩니다.
 *
 * @param props - 관리자 인증 정보 및 요청 바디 필터/정렬/페이징 값
 * @param props.admin - 인증된 관리자 (AdminPayload)
 * @param props.body - IAiCommerceStoreBanking.IRequest 검색/페이징/정렬/필터 조건
 * @returns IPageIAiCommerceStoreBanking.ISummary 페이징/마스킹된 상점 은행 정보 리스트
 * @throws {Error} 유효하지 않은 쿼리/필터/정렬 요청이나 권한 미달의 경우 오류 발생
 */
export async function patchaiCommerceAdminStoreBanking(props: {
  admin: AdminPayload;
  body: IAiCommerceStoreBanking.IRequest;
}): Promise<IPageIAiCommerceStoreBanking.ISummary> {
  const { body } = props;

  // WHERE 조건 빌드 (정의된 필드만, null/undefined 엄격 처리)
  const where = {
    deleted_at: null,
    ...(body.store_id !== undefined &&
      body.store_id !== null && { store_id: body.store_id }),
    ...(body.bank_name !== undefined &&
      body.bank_name !== null && { bank_name: { contains: body.bank_name } }),
    ...(body.account_holder_name !== undefined &&
      body.account_holder_name !== null && {
        account_holder_name: { contains: body.account_holder_name },
      }),
    ...(body.account_number !== undefined &&
      body.account_number !== null && { account_number: body.account_number }),
    ...(body.verified !== undefined &&
      body.verified !== null && { verified: body.verified }),
    // 날짜 검색 지원 (created_from, created_to)
    ...((body.created_from !== undefined && body.created_from !== null) ||
    (body.created_to !== undefined && body.created_to !== null)
      ? {
          created_at: {
            ...(body.created_from !== undefined &&
              body.created_from !== null && { gte: body.created_from }),
            ...(body.created_to !== undefined &&
              body.created_to !== null && { lte: body.created_to }),
          },
        }
      : {}),
  };

  // 지원 정렬 필드 파싱 (없으면 기본값)
  let orderBy = { created_at: "desc" as const };
  if (body.sort) {
    const raw = String(body.sort);
    const [sortFieldRaw, sortDirRaw] = raw.split(":");
    const allowedSortFields = [
      "created_at",
      "bank_name",
      "account_holder_name",
      "verified",
    ];
    const allowedDir = ["asc", "desc"];
    if (
      allowedSortFields.includes(sortFieldRaw) &&
      allowedDir.includes(sortDirRaw)
    ) {
      orderBy = { [sortFieldRaw]: sortDirRaw as "asc" | "desc" };
    }
  }

  // 페이징 파라미터 정리(브랜드 제거)
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 20);
  const skip = (page - 1) * limit;
  const take = limit;

  // 병렬 DB 조회(목록+카운트)
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_store_banking.findMany({
      where,
      orderBy,
      skip,
      take,
    }),
    MyGlobal.prisma.ai_commerce_store_banking.count({ where }),
  ]);

  // 민감 정보 마스킹
  const maskAccountNumber = (num: string): string => {
    if (!num || num.length < 4) return "****";
    return "****" + num.substring(num.length - 4);
  };
  const maskRoutingCode = (code: string | null | undefined): string | null => {
    if (!code) return null;
    if (code.length <= 4) return "**";
    return code.substring(0, 2) + "****" + code.substring(code.length - 2);
  };

  // 결과 DTO 변환 (정확한 null/undefined 구분, interface 맞춤)
  const data = rows.map((row) => ({
    id: row.id,
    store_id: row.store_id,
    bank_name: row.bank_name,
    account_number: maskAccountNumber(row.account_number),
    account_holder_name: row.account_holder_name,
    routing_code:
      row.routing_code === null || row.routing_code === undefined
        ? null
        : maskRoutingCode(row.routing_code),
    verified: row.verified,
  }));

  // 페이징 메타 포함 반환 (브랜드 제거)
  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
