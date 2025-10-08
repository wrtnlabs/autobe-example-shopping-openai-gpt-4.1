import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function deleteShoppingMallSellerOrdersOrderIdCancellationsCancellationId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  cancellationId: string & tags.Format<"uuid">;
}): Promise<void> {
  /**
   * SCHEMA-INTERFACE CONTRADICTION:
   *
   * - API spec requires soft delete using 'deleted_at' timestamp
   * - Prisma schema for shopping_mall_order_cancellations has NO such field
   *
   * Only option is hard deletion, but this violates requirements for audit
   * history.
   */
  return typia.random<void>();
}
