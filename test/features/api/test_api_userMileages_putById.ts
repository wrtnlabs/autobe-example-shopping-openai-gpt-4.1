import api from "@ORGANIZATION/PROJECT-api";
import typia, { tags } from "typia";

import { IUserMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserMileage";

export async function test_api_userMileages_putById(
  connection: api.IConnection,
) {
  const output: IUserMileage = await api.functional.userMileages.putById(
    connection,
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      body: typia.random<IUserMileage.IUpdate>(),
    },
  );
  typia.assert(output);
}
