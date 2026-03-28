import {
  SantaiBuiltinClass,
  SantaiError,
  SantaiObject,
  SantaiType,
} from "../objects/object";
import { arg, defineAndRegisterGlobalClass } from "./builtin";

function constructError(args: SantaiObject[]): SantaiObject {
  const message = arg(args, 0);
  const name = arg(args, 1);

  return new SantaiError(
    message.isString() ? message.value : message.inspect(),
    name.isString() ? name.value : name.inspect()
  );
}

defineAndRegisterGlobalClass(
  new SantaiBuiltinClass("Masalah", SantaiType.kError, constructError)
);
