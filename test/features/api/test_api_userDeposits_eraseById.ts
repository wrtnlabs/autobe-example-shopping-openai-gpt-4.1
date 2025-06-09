import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserDeposit } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserDeposit";

export async function test_api_userDeposits_eraseById(
  connection: api.IConnection,
) {
  const output: IUserDeposit = await api.functional.userDeposits.eraseById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
}
