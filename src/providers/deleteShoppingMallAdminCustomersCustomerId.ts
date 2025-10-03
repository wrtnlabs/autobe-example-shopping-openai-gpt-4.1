import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCustomersCustomerId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customerId } = props;
  // Try to find the customer who is not already deleted
  const customer = await MyGlobal.prisma.shopping_mall_customers.findFirst({
    where: {
      id: customerId,
      deleted_at: null,
    },
  });
  if (!customer) {
    // Check if it's already deleted or truly not found (id could exist but be deleted)
    const previouslyDeleted =
      await MyGlobal.prisma.shopping_mall_customers.findFirst({
        where: { id: customerId },
      });
    if (previouslyDeleted && previouslyDeleted.deleted_at !== null) {
      throw new HttpException("Customer already deleted", 400);
    }
    throw new HttpException("Customer not found", 404);
  }
  // Perform the soft delete (update deleted_at)
  await MyGlobal.prisma.shopping_mall_customers.update({
    where: { id: customerId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
  // No result to return
}
