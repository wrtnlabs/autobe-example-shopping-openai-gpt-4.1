import jwt from "jsonwebtoken";
import { MyGlobal } from "../MyGlobal";
import typia, { tags } from "typia";
import { Prisma } from "@prisma/client";
import { v4 } from "uuid";
import { toISOStringSafe } from "../util/toISOStringSafe";
import { IAiCommerceCartSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IAiCommerceCartSession";
import { IPageIAiCommerceCartSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIAiCommerceCartSession";
import { BuyerPayload } from "../decorators/payload/BuyerPayload";

export async function patchaiCommerceBuyerCartSessions(props: {
  buyer: BuyerPayload;
  body: IAiCommerceCartSession.IRequest;
}): Promise<IPageIAiCommerceCartSession> {
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit > 0 ? props.body.limit : 20;
  const skip = (page - 1) * limit;

  const where = {
    buyer_id: props.buyer.id,
    ...(props.body.session_token !== undefined &&
      props.body.session_token !== null && {
        session_token: { contains: props.body.session_token },
      }),
    ...(props.body.status !== undefined &&
      props.body.status !== null && {
        status: props.body.status,
      }),
  };

  const [rows, total] = await Promise.all([
    MyGlobal.prisma.ai_commerce_cart_sessions.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.ai_commerce_cart_sessions.count({ where }),
  ]);

  const data: IAiCommerceCartSession[] = rows.map((row) => {
    return {
      id: row.id,
      buyer_id: row.buyer_id === null ? undefined : row.buyer_id,
      cart_id: row.cart_id,
      session_token: row.session_token,
      status: row.status,
      expires_at: row.expires_at ? toISOStringSafe(row.expires_at) : undefined,
      created_at: toISOStringSafe(row.created_at),
      updated_at: toISOStringSafe(row.updated_at),
      // deleted_at is omitted unless it is in the row type
    };
  });

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
