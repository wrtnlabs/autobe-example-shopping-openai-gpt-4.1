import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICouponRedemption } from "@ORGANIZATION/PROJECT-api/lib/structures/ICouponRedemption";

export async function test_api_couponRedemptions_getById(
  connection: api.IConnection,
) {
  const output: ICouponRedemption =
    await api.functional.couponRedemptions.getById(connection, {
      id: typia.random<string & tags.Format<"uuid">>(),
    });
  typia.assert(output);
}
