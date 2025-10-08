import { tags } from "typia";

/** Customer 역할 JWT Payload */
export interface CustomerPayload {
  /** Top-level customer ID (shopping_mall_customers.id) */
  id: string & tags.Format<"uuid">;

  /** 역할 구분자 (discriminator) */
  type: "customer";
}
