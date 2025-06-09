import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserBalance } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserBalance";

export async function test_api_userBalances_putById(
  connection: api.IConnection,
) {
  const output: IUserBalance = await api.functional.userBalances.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IUserBalance.IUpdate>(),
    },
  );
  typia.assert(output);
}
