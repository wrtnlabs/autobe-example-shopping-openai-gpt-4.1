import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { CustomerPayload } from "../../decorators/payload/CustomerPayload";

/**
 * JWT 인증 및 Customer 권한 검증 Provider
 * @param request HTTP 요청 객체
 * @returns CustomerPayload
 * @throws ForbiddenException 인증 실패 시
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

  // payload.id는 shopping_mall_customers 테이블의 top-level ID임
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active"
    },
  });

  if (customer === null) {
    throw new ForbiddenException("You're not enrolled or not an active customer");
  }

  return payload;
}
