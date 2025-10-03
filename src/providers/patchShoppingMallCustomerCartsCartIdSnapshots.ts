import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartSnapshot";
import { IPageIShoppingMallCartSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerCartsCartIdSnapshots(props: {
  customer: CustomerPayload;
  cartId: string & tags.Format<"uuid">;
  body: IShoppingMallCartSnapshot.IRequest;
}): Promise<IPageIShoppingMallCartSnapshot> {
  // 1. Fetch cart and verify ownership
  const cart = await MyGlobal.prisma.shopping_mall_carts.findUnique({
    where: { id: props.cartId },
    select: { shopping_mall_customer_id: true },
  });
  if (!cart || cart.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden: Only the owner can access cart snapshots",
      403,
    );
  }
  // 2. Paging params
  const page = props.body.page ?? 1;
  let limit = props.body.limit ?? 20;
  if (limit > 100) limit = 100;
  if (limit < 1) limit = 1;
  const skip = (page - 1) * limit;

  // 3. Date filter window
  const createdAfter = props.body.created_after;
  const createdBefore = props.body.created_before;

  // 4. where filter
  const where = {
    shopping_mall_cart_id: props.cartId,
    ...(createdAfter !== undefined && { created_at: { gte: createdAfter } }),
    ...(createdBefore !== undefined && {
      created_at: {
        ...(createdAfter !== undefined && { gte: createdAfter }),
        lte: createdBefore,
      },
    }),
  };
  // If both filters are undefined, created_at key won't be present

  // 5. Query
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.shopping_mall_cart_snapshots.count({ where }),
    MyGlobal.prisma.shopping_mall_cart_snapshots.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_cart_id: true,
        snapshot_data: true,
        created_at: true,
      },
    }),
  ]);
  const data = rows.map((row) => ({
    id: row.id,
    shopping_mall_cart_id: row.shopping_mall_cart_id,
    snapshot_data: row.snapshot_data,
    created_at: toISOStringSafe(row.created_at),
  }));
  // 6. Pagination info
  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / limit),
  };
  return {
    pagination,
    data,
  };
}
