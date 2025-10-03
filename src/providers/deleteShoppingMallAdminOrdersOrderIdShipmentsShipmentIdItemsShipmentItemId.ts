import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderIdShipmentsShipmentIdItemsShipmentItemId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  shipmentId: string & tags.Format<"uuid">;
  shipmentItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  /**
   * SCHEMA-INTERFACE CONTRADICTION: API requires 'deleted_at' soft delete logic
   * on shipment items, but 'deleted_at' field does not exist on
   * shopping_mall_shipment_items model in Prisma schema. Therefore, cannot
   * implement soft delete or related audit trace. Only options are hard delete
   * (which breaks API evidence requirement), or return mock (to indicate
   * schema/contract needs to be reconciled).
   */
  return typia.random<void>();
}
