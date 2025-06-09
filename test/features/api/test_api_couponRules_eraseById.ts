import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { ICouponRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICouponRule";

export async function test_api_couponRules_eraseById(
  connection: api.IConnection,
) {
  const output: ICouponRule = await api.functional.couponRules.eraseById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
