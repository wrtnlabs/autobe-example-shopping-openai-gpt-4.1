import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postShoppingMallAdminProductsProductIdVariants(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariant.ICreate;
}): Promise<IShoppingMallProductVariant> {
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  try {
    const created = await MyGlobal.prisma.shopping_mall_product_variants.create(
      {
        data: {
          id: v4(),
          shopping_mall_product_id: props.productId,
          sku_code: props.body.sku_code,
          bar_code: props.body.bar_code ?? null,
          option_values_hash: props.body.option_values_hash,
          price: props.body.price,
          stock_quantity: props.body.stock_quantity,
          weight: props.body.weight,
          created_at: now,
          updated_at: now,
          deleted_at: undefined,
        },
      },
    );
    return {
      id: created.id,
      shopping_mall_product_id: created.shopping_mall_product_id,
      sku_code: created.sku_code,
      bar_code: created.bar_code ?? null,
      option_values_hash: created.option_values_hash,
      price: created.price,
      stock_quantity: created.stock_quantity,
      weight: created.weight,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : undefined,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        "Duplicate SKU code or option combination for this product.",
        409,
      );
    }
    throw error;
  }
}
