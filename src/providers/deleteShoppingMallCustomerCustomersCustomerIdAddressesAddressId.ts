import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerCustomersCustomerIdAddressesAddressId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, customerId, addressId } = props;

  // Check address exists and is owned by customer
  const address =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findFirst({
      where: {
        id: addressId,
        customer_id: customerId,
        deleted_at: null,
      },
    });
  if (!address)
    throw new HttpException("Address not found or inaccessible", 404);
  if (address.customer_id !== customer.id)
    throw new HttpException(
      "Forbidden: You can only delete your own address",
      403,
    );

  // Business logic: Check if address is default
  if (address.is_default) {
    // Find another address (not the one being deleted, not deleted)
    const another =
      await MyGlobal.prisma.shopping_mall_customer_addresses.findFirst({
        where: {
          customer_id: customer.id,
          id: { not: addressId },
          deleted_at: null,
        },
        orderBy: { created_at: "asc" },
      });
    if (another) {
      // Set another address as default
      await MyGlobal.prisma.shopping_mall_customer_addresses.update({
        where: { id: another.id },
        data: {
          is_default: true,
          updated_at: toISOStringSafe(new Date()),
        },
      });
    }
  }

  // Soft delete the address
  await MyGlobal.prisma.shopping_mall_customer_addresses.update({
    where: { id: addressId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      is_default: false,
    },
  });
}
