import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerMileagesMileageId(props: {
  customer: CustomerPayload;
  mileageId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Load the mileage record
  const mileage = await MyGlobal.prisma.shopping_mall_mileages.findUnique({
    where: { id: props.mileageId },
  });
  if (!mileage) {
    throw new HttpException("Mileage account not found", 404);
  }
  // 2. Check ownership
  if (mileage.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "You do not have permission to delete this mileage account",
      403,
    );
  }
  // 3. Check already deleted
  if (mileage.deleted_at !== null) {
    throw new HttpException("Mileage account is already deleted", 400);
  }
  // 4. Soft delete (set deleted_at with ISO string)
  await MyGlobal.prisma.shopping_mall_mileages.update({
    where: { id: props.mileageId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
