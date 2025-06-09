import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserAddress";

export async function test_api_userAddresses_putById(
  connection: api.IConnection,
) {
  const output: IUserAddress = await api.functional.userAddresses.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IUserAddress.IUpdate>(),
    },
  );
  typia.assert(output);
}
