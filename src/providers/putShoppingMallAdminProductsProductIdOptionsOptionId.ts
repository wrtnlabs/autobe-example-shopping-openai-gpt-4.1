import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOption";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminProductsProductIdOptionsOptionId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  optionId: string & tags.Format<"uuid">;
  body: IShoppingMallProductOption.IUpdate;
}): Promise<IShoppingMallProductOption> {
  // Find the option by both id and product id
  const existing =
    await MyGlobal.prisma.shopping_mall_product_options.findFirst({
      where: {
        id: props.optionId,
        shopping_mall_product_id: props.productId,
      },
    });
  if (!existing) {
    throw new HttpException("Product option not found", 404);
  }
  try {
    const updated = await MyGlobal.prisma.shopping_mall_product_options.update({
      where: { id: props.optionId },
      data: {
        name: props.body.name ?? undefined,
        display_order: props.body.display_order ?? undefined,
        updated_at: toISOStringSafe(new Date()),
      },
    });
    return {
      id: updated.id,
      shopping_mall_product_id: updated.shopping_mall_product_id,
      name: updated.name,
      display_order: updated.display_order,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("Duplicate option name for this product", 409);
    }
    throw err;
  }
}
