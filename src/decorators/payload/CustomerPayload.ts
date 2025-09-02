import { tags } from "typia";

/** 인증된 고객 JWT Payload 타입. id는 최상위 customer 테이블의 UUID. */
export interface CustomerPayload {
  /** 최상위 customer 테이블의 UUID (시스템 내 기본 고객 식별자) */
  id: string & tags.Format<"uuid">;

  /** 식별자(discriminator)로 항상 "customer" 값 사용 */
  type: "customer";
}
