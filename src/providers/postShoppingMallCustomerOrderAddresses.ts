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

export async function postShoppingMallCustomerOrderAddresses(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrderAddress.ICreate;
}): Promise<IShoppingMallOrderAddress> {
  const now = toISOStringSafe(new Date());
  const uuid = v4();

  const created = await MyGlobal.prisma.shopping_mall_order_addresses.create({
    data: {
      id: uuid,
      address_type: props.body.address_type,
      recipient_name: props.body.recipient_name,
      phone: props.body.phone,
      zip_code: props.body.zip_code,
      address_main: props.body.address_main,
      address_detail: props.body.address_detail ?? null,
      country_code: props.body.country_code,
      created_at: now,
    },
  });

  return {
    id: created.id,
    address_type: created.address_type,
    recipient_name: created.recipient_name,
    phone: created.phone,
    zip_code: created.zip_code,
    address_main: created.address_main,
    address_detail: created.address_detail ?? null,
    country_code: created.country_code,
    created_at: toISOStringSafe(created.created_at), // always string
  };
}
