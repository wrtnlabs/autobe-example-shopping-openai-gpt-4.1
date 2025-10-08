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

export async function postShoppingMallSellerProductsProductIdOptions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOption.ICreate;
}): Promise<IShoppingMallProductOption> {
  // 1. Confirm product exists and is owned by seller
  const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
    where: {
      id: props.productId,
      shopping_mall_seller_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (!product) {
    throw new HttpException(
      "Unauthorized: You do not own this product or it does not exist",
      403,
    );
  }
  // 2. Prepare new option data
  const now = toISOStringSafe(new Date());
  let created;
  try {
    created = await MyGlobal.prisma.shopping_mall_product_options.create({
      data: {
        id: v4(),
        shopping_mall_product_id: props.productId,
        name: props.body.name,
        display_order: props.body.display_order,
        created_at: now,
        updated_at: now,
      },
    });
  } catch (err: any) {
    // Handle unique constraint error (duplicate name)
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException(
        "Duplicate product option name for this product.",
        409,
      );
    }
    throw err;
  }
  // 3. Return API shape
  return {
    id: created.id,
    shopping_mall_product_id: created.shopping_mall_product_id,
    name: created.name,
    display_order: created.display_order,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
  };
}
