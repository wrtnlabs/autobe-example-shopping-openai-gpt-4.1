import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerCustomersCustomerIdAddressesAddressId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
  body: IShoppingMallCustomerAddress.IUpdate;
}): Promise<IShoppingMallCustomerAddress> {
  const address =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findFirst({
      where: {
        id: props.addressId,
        customer_id: props.customerId,
        deleted_at: null,
      },
    });
  if (!address) {
    throw new HttpException("Address not found", 404);
  }
  if (address.customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: Cannot update another customer's address",
      403,
    );
  }

  // If is_default=true, unset is_default for others first
  if (props.body.is_default === true) {
    await MyGlobal.prisma.shopping_mall_customer_addresses.updateMany({
      where: {
        customer_id: props.customerId,
        id: { not: props.addressId },
        deleted_at: null,
        is_default: true,
      },
      data: {
        is_default: false,
      },
    });
  }

  // Update address fields
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_customer_addresses.update(
    {
      where: { id: props.addressId },
      data: {
        recipient_name: props.body.recipient_name,
        phone: props.body.phone,
        region: props.body.region,
        postal_code: props.body.postal_code,
        address_line1: props.body.address_line1,
        address_line2: props.body.address_line2 ?? null,
        is_default: props.body.is_default ?? address.is_default,
        updated_at: now,
      },
    },
  );

  return {
    id: updated.id,
    customer_id: updated.customer_id,
    recipient_name: updated.recipient_name,
    phone: updated.phone,
    region: updated.region,
    postal_code: updated.postal_code,
    address_line1: updated.address_line1,
    address_line2:
      typeof updated.address_line2 === "string" ? updated.address_line2 : null,
    is_default: updated.is_default,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
