import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserDeposit";

export async function test_api_userDeposits_putById(
  connection: api.IConnection,
) {
  const output: IUserDeposit = await api.functional.userDeposits.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IUserDeposit.IUpdate>(),
    },
  );
  typia.assert(output);
}
