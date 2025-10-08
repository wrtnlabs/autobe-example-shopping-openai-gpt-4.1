import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderAddress";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrderAddressesOrderAddressId(props: {
  customer: CustomerPayload;
  orderAddressId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderAddress> {
  // Step 1: Find the order address record by id (do NOT use deleted_at field)
  const orderAddress =
    await MyGlobal.prisma.shopping_mall_order_addresses.findUnique({
      where: {
        id: props.orderAddressId,
      },
    });
  if (!orderAddress) {
    throw new HttpException("Order address not found", 404);
  }
  // Step 2: Ensure at least one order exists that uses this address and belongs to this customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      shipping_address_id: props.orderAddressId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (!order) {
    throw new HttpException(
      "Forbidden: you do not have access to this order address",
      403,
    );
  }
  // Step 3: Map fields to DTO
  return {
    id: orderAddress.id,
    address_type: orderAddress.address_type,
    recipient_name: orderAddress.recipient_name,
    phone: orderAddress.phone,
    zip_code: orderAddress.zip_code,
    address_main: orderAddress.address_main,
    address_detail:
      orderAddress.address_detail === undefined
        ? undefined
        : orderAddress.address_detail === null
          ? null
          : orderAddress.address_detail,
    country_code: orderAddress.country_code,
    created_at: toISOStringSafe(orderAddress.created_at),
  };
}
