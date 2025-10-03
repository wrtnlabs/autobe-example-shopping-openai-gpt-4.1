import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderIdAfterSaleServicesAfterSaleServiceId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  afterSaleServiceId: string & tags.Format<"uuid">;
}): Promise<void> {
  const service =
    await MyGlobal.prisma.shopping_mall_after_sale_services.findUnique({
      where: { id: props.afterSaleServiceId },
    });
  if (!service || service.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "After-sales service case not found for specified order.",
      404,
    );
  }
  if (service.deleted_at !== null) {
    throw new HttpException(
      "After-sales service case has already been deleted.",
      404,
    );
  }
  if (
    service.status === "resolved" ||
    service.status === "locked" ||
    service.status === "escalated"
  ) {
    throw new HttpException(
      "Cannot delete a resolved, locked, or escalated after-sales service case.",
      409,
    );
  }
  await MyGlobal.prisma.shopping_mall_after_sale_services.update({
    where: { id: props.afterSaleServiceId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // (Snapshot/audit log logic would go here if required)
}
