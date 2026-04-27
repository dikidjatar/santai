// Copyright (c) [2026] [Diki Djatar]
// SPDX-License-Identifier: MIT

import path from "path";
import { ExitCode } from "../base/exitCode";
import { Interpreter } from "../interpreter/interpreter";
import { Factory, SantaiModule, SantaiObject } from "../objects/object";
import { Pipeline } from "../runtime/pipeline";
import { makeScriptContext, RuntimeContext } from "../runtime/runtimeContext";
import { SourceFile } from "../runtime/sourceFile";

export class ModuleRunner {
  /**
   * Execute `source` as a Santai module.
   *
   * @param source - The source file to execute.
   * @returns A `SantaiModule` whose namespace mirrors the module's global scope.
   * @throws {ModuleLoadError} on parse or runtime errors.
   */
  run(source: SourceFile): SantaiModule {
    const runtimeCtx: RuntimeContext = makeScriptContext(source.filepath, []);
    const pipeline: Pipeline = Pipeline.from(source, runtimeCtx);
    pipeline.run();

    if (pipeline.getErrorHandler().hasErrors()) {
      process.exit(ExitCode.SourceError);
    }

    // Extract exported namespace
    // Everything declared at the top level becomes a module export.
    // Built-in globals are intentionally excluded. Only user code is exported.
    const exports = new Map<string, SantaiObject>();
    const interpreter: Interpreter = pipeline.getInterpreter();
    for (const [name, slot] of interpreter.getModuleEnv().getAllSlots()) {
      exports.set(name, slot.value);
    }

    const moduleName = path.basename(
      source.filepath,
      path.extname(source.filepath)
    );
    return Factory.NewModule(moduleName, source.filepath, exports);
  }
}
