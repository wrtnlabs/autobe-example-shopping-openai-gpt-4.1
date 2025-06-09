import api from "@ORGANIZATION/PROJECT-api";
import typia from "typia";

import { ILocalizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ILocalizationFile";

export async function test_api_localizationFiles_post(
  connection: api.IConnection,
) {
  const output: ILocalizationFile = await api.functional.localizationFiles.post(
    connection,
    {
      body: typia.random<ILocalizationFile.ICreate>(),
    },
  );
  typia.assert(output);
}
