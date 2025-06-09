import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICoupon } from "@ORGANIZATION/PROJECT-api/lib/structures/ICoupon";

export async function test_api_coupons_eraseById(connection: api.IConnection) {
  const output: ICoupon = await api.functional.coupons.eraseById(connection, {
    id: typia.random<string & tags.Format<"uuid">>(),
  });
  typia.assert(output);
}
