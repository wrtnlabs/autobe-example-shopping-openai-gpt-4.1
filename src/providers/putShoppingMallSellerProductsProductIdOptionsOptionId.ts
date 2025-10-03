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
  const { seller, productId, optionId, body } = props;
  // 1. Fetch product and check ownership
  const product = await MyGlobal.prisma.shopping_mall_products.findUnique({
    where: { id: productId },
    select: {
      id: true,
      shopping_mall_seller_id: true,
      deleted_at: true,
    },
  });
  if (!product || product.deleted_at !== null) {
    throw new HttpException("Product not found", 404);
  }
  if (product.shopping_mall_seller_id !== seller.id) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }
  // 2. Fetch the option
  const option = await MyGlobal.prisma.shopping_mall_product_options.findUnique(
    {
      where: { id: optionId },
      select: {
        id: true,
        shopping_mall_product_id: true,
        name: true,
        deleted_at: true,
      },
    },
  );
  if (
    !option ||
    option.shopping_mall_product_id !== productId ||
    option.deleted_at !== null
  ) {
    throw new HttpException("Option not found", 404);
  }
  // 3. Check for duplicate name if updating name
  if (typeof body.name === "string" && body.name !== option.name) {
    const count = await MyGlobal.prisma.shopping_mall_product_options.count({
      where: {
        shopping_mall_product_id: productId,
        name: body.name,
        id: { not: optionId },
        deleted_at: null,
      },
    });
    if (count > 0) {
      throw new HttpException(
        "Option name must be unique within this product",
        409,
      );
    }
  }
  // 4. Prepare update input
  const now = toISOStringSafe(new Date());
  const updated = await MyGlobal.prisma.shopping_mall_product_options.update({
    where: { id: optionId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.required !== undefined ? { required: body.required } : {}),
      ...(body.position !== undefined ? { position: body.position } : {}),
      updated_at: now,
    },
    select: {
      id: true,
      shopping_mall_product_id: true,
      name: true,
      required: true,
      position: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    id: updated.id,
    shopping_mall_product_id: updated.shopping_mall_product_id,
    name: updated.name,
    required: updated.required,
    position: updated.position,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
