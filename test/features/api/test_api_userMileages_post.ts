import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { IUserMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IUserMileage";

export async function test_api_userMileages_post(connection: api.IConnection) {
  const output: IUserMileage = await api.functional.userMileages.post(
    connection,
    {
      body: typia.random<IUserMileage.ICreate>(),
    },
  );
  typia.assert(output);
}
