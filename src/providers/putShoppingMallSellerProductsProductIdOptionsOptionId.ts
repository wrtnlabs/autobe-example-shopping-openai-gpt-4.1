import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerProductsProductIdOptionsOptionId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOption.IUpdate;
}): Promise<IShoppingMallProductOption> {
  // Verify product belongs to this seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException("Product not found or unauthorized", 404);
  }

  // Find the option and ensure it's part of the correct product
  const option = await MyGlobal.prisma.shopping_mall_product_options.findFirst({
    where: {
      id: props.optionId,
      shopping_mall_product_id: props.productId,
    },
  });
  if (!option) {
    throw new HttpException("Product option not found", 404);
  }

  // Attempt update
  let updated;
  try {
    updated = await MyGlobal.prisma.shopping_mall_product_options.update({
      where: { id: props.optionId },
      data: {
        name: props.body.name ?? undefined,
        display_order: props.body.display_order ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });
  } catch (err: any) {
    // Duplicate name unique constraint violated for (shopping_mall_product_id, name)
    if (err && typeof err.code === "string" && err.code === "P2002") {
      throw new HttpException("Duplicate option name for this product", 409);
    }
    throw err;
  }

  // Convert Date fields to string & tags.Format<'date-time'> (never use Date type)
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    name: updated.name,
    display_order: updated.display_order,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
