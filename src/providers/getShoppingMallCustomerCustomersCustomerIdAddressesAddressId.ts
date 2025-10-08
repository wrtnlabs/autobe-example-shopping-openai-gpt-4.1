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

export async function getShoppingMallCustomerCustomersCustomerIdAddressesAddressId(props: {
  customer: CustomerPayload;
  customerId: string & tags.Format<"uuid">;
  addressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallCustomerAddress> {
  const { customer, customerId, addressId } = props;

  if (customer.id !== customerId) {
    throw new HttpException(
      "Forbidden: Customers can only access their own addresses",
      403,
    );
  }

  const address =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findFirst({
      where: {
        id: addressId,
        customer_id: customerId,
        deleted_at: null,
      },
    });

  if (!address) {
    throw new HttpException("Address not found or not accessible", 404);
  }

  return {
    id: address.id,
    customer_id: address.customer_id,
    recipient_name: address.recipient_name,
    phone: address.phone,
    region: address.region,
    postal_code: address.postal_code,
    address_line1: address.address_line1,
    address_line2:
      address.address_line2 === undefined
        ? undefined
        : address.address_line2 === null
          ? null
          : address.address_line2,
    is_default: address.is_default,
    created_at: toISOStringSafe(address.created_at),
    updated_at: toISOStringSafe(address.updated_at),
    deleted_at:
      address.deleted_at === undefined
        ? undefined
        : address.deleted_at === null
          ? undefined
          : toISOStringSafe(address.deleted_at),
  };
}
