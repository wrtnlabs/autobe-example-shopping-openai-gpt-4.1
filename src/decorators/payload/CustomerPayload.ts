import { tags } from "typia";

export interface CustomerPayload {
  /** 고객 식별자(UUID) - shopping_mall_customers 테이블의 PK */
  id: string & tags.Format<"uuid">;

  /** 구분자 */
  type: "customer";
}
