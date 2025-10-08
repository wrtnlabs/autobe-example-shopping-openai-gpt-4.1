import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminCustomersCustomerIdAddressesAddressId(props: {
  admin: AdminPayload;
  customerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customerId, addressId } = props;

  // 1. Find address and verify ownership
  const address =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findFirst({
      where: {
        id: addressId,
        customer_id: customerId,
        deleted_at: null,
      },
    });
  if (!address) {
    throw new HttpException("Address not found", 404);
  }

  // 2. Soft delete by setting deleted_at to now
  const deletedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.shopping_mall_customer_addresses.update({
    where: { id: addressId },
    data: { deleted_at: deletedAt },
  });

  // 3. If was default, assign another as default (if any)
  if (address.is_default) {
    // Find another (not deleted) address for customer
    const another =
      await MyGlobal.prisma.shopping_mall_customer_addresses.findFirst({
        where: {
          customer_id: customerId,
          deleted_at: null,
          id: { not: addressId },
        },
      });

    if (another) {
      await MyGlobal.prisma.shopping_mall_customer_addresses.update({
        where: { id: another.id },
        data: { is_default: true },
      });
    }
    // Otherwise no other address, nothing to do
  }
}
