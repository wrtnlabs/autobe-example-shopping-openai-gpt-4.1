import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminMileagesMileageId(props: {
  admin: AdminPayload;
  mileageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find mileage by ID, ensure not already deleted
  const mileage = await MyGlobal.prisma.shopping_mall_mileages.findUnique({
    where: { id: props.mileageId },
    select: { deleted_at: true },
  });
  if (!mileage) {
    throw new HttpException("Mileage account not found", 404);
  }
  if (mileage.deleted_at !== null) {
    throw new HttpException("Mileage account is already deleted", 400);
  }
  await MyGlobal.prisma.shopping_mall_mileages.update({
    where: { id: props.mileageId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
