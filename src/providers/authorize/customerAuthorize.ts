import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { CustomerPayload } from "../../decorators/payload/CustomerPayload";

/**
 * 인증된 고객(Consumer)을 검증 및 반환하는 Provider 함수입니다.
 * JWT 토큰을 검증하고, payload.type이 "customer" 인지 확인한 후,
 * 실제 DB에서 삭제되지 않았으며(is_active=true, deleted_at=null) 활성 상태인 고객만 인증합니다.
 *
 * @param request NestJS Request 객체({ headers: { authorization } })
 * @throws ForbiddenException 인증 실패 또는 활성화되지 않은 고객 계정일 때 예외 발생
 * @returns CustomerPayload 인증된 고객 Payload 반환
 */
export async function customerAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<CustomerPayload> {
  const payload: CustomerPayload = jwtAuthorize({ request }) as CustomerPayload;

  if (payload.type !== "customer") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id 는 최상위 customer 테이블의 id(기본 유저 PK)
  const customer = await MyGlobal.prisma.shopping_mall_ai_backend_customers.findFirst({
    where: {
      id: payload.id,
      is_active: true,
      deleted_at: null,
    },
  });

  if (customer === null) {
    throw new ForbiddenException("You're not enrolled or account is inactive/deleted");
  }

  return payload;
}
