import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.ICreate;
}): Promise<IShoppingMallProduct> {
  const { seller, body } = props;
  // Authorization: only allow seller to create product for themselves
  if (body.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Forbidden: You cannot create a product for another seller.",
      403,
    );
  }

  // Uniqueness: no duplicate product code for this seller
  const existing = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      shopping_mall_seller_id: body.shopping_mall_seller_id,
      code: body.code,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Duplicate product code for this seller.", 409);
  }

  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.shopping_mall_products.create({
    data: {
      id: v4(),
      shopping_mall_seller_id: body.shopping_mall_seller_id,
      shopping_mall_channel_id: body.shopping_mall_channel_id,
      shopping_mall_section_id: body.shopping_mall_section_id,
      shopping_mall_category_id: body.shopping_mall_category_id,
      code: body.code,
      name: body.name,
      status: body.status,
      business_status: body.business_status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  return {
    id: created.id,
    shopping_mall_seller_id: created.shopping_mall_seller_id,
    shopping_mall_channel_id: created.shopping_mall_channel_id,
    shopping_mall_section_id: created.shopping_mall_section_id,
    shopping_mall_category_id: created.shopping_mall_category_id,
    code: created.code,
    name: created.name,
    status: created.status,
    business_status: created.business_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
