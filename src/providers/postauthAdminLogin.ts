import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceAdmin";

/**
 * 로그인/인증 엔드포인트 (관리자용, ai_commerce_admin 테이블)
 *
 * 관리자 계정 이메일/비밀번호 조합으로 인증 및 토큰 발급. 활성 상태가 아닐 경우 인증 불가. 모든 로그인 시도는 증거/감사를 위해
 * ai_commerce_audit_logs_user 테이블에 기록됨. 로그인이 성공하면 인증
 * 세션(ai_commerce_user_authentications) 생성, 토큰 구조와 만료 정보 포함 반환. 실패(미존재, 정지/삭제,
 * 비밀번호 불일치)는 모두 차별화 없이 동일 오류 반환하며 상세 상태 노출 안함.
 *
 * @param props - { body: 로그인 요청 (이메일/비밀번호) }
 * @returns 관리자 id, access·refresh 토큰, 만료 정보
 * @throws {Error} 인증 실패(이메일, 비밀번호, 정지/삭제)
 */
export async function postauthAdminLogin(props: {
  body: IAiCommerceAdmin.ILogin;
}): Promise<IAiCommerceAdmin.IAuthorized> {
  const { body } = props;
  // 1. 관리자 계정 조회(삭제되지 않음)
  const admin = await MyGlobal.prisma.ai_commerce_admin.findFirst({
    where: { email: body.email, deleted_at: null },
  });
  // 2. 계정 존재/상태 확인
  if (!admin || admin.status !== "active") {
    // 감사로그 기록 (실패)
    await MyGlobal.prisma.ai_commerce_audit_logs_user.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        admin_id: admin ? admin.id : undefined,
        action_type: "login",
        subject_type: "admin",
        subject_id: admin ? admin.id : (v4() as string & tags.Format<"uuid">),
        ip_address: undefined,
        device_info: undefined,
        created_at: toISOStringSafe(new Date()),
      },
    });
    throw new Error("Invalid credentials");
  }
  // 3. 비밀번호 검증
  const passwordMatch = await MyGlobal.password.verify(
    body.password,
    admin.password_hash,
  );
  if (!passwordMatch) {
    await MyGlobal.prisma.ai_commerce_audit_logs_user.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        admin_id: admin.id,
        action_type: "login",
        subject_type: "admin",
        subject_id: admin.id,
        ip_address: undefined,
        device_info: undefined,
        created_at: toISOStringSafe(new Date()),
      },
    });
    throw new Error("Invalid credentials");
  }
  // 4. 토큰/세션 관련 시간 생성(문자열)
  const now = toISOStringSafe(new Date());
  const accessExpMs = 60 * 60 * 1000; // 1h
  const refreshExpMs = 7 * 24 * 60 * 60 * 1000; // 7d
  const accessUntil = toISOStringSafe(new Date(Date.now() + accessExpMs));
  const refreshUntil = toISOStringSafe(new Date(Date.now() + refreshExpMs));
  // 5. JWT 생성 (payload 구조: { id, type: "admin" })
  const access = jwt.sign(
    { id: admin.id, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refresh = jwt.sign(
    { id: admin.id, type: "admin" },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  // 6. 인증 세션 기록
  await MyGlobal.prisma.ai_commerce_user_authentications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: admin.id,
      method: "password",
      device_info: undefined,
      ip_address: undefined,
      session_expires_at: refreshUntil,
      created_at: now,
      updated_at: now,
      deleted_at: undefined,
      buyer_id: undefined,
    },
  });
  // 7. 감사로그 기록 (성공)
  await MyGlobal.prisma.ai_commerce_audit_logs_user.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      admin_id: admin.id,
      action_type: "login",
      subject_type: "admin",
      subject_id: admin.id,
      ip_address: undefined,
      device_info: undefined,
      created_at: now,
      buyer_id: undefined,
    },
  });
  // 8. 응답 반환 (타입 안전)
  return {
    id: admin.id,
    token: {
      access,
      refresh,
      expired_at: accessUntil,
      refreshable_until: refreshUntil,
    },
  };
}
