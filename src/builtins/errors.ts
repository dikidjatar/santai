import {
  Factory,
  SantaiError,
  SantaiObject,
  SantaiType,
} from "../objects/object";
import { arg, defineAndRegisterGlobalClass } from "./builtin";

function constructError(args: SantaiObject[]): SantaiObject {
  const message = arg(args, 0);
  const name = arg(args, 1);

  return new SantaiError(
    message.isString() ? message.value : "masalah tidak diketahui",
    name.isString() ? name.value : "Masalah"
  );
}

defineAndRegisterGlobalClass(
  Factory.NewBuiltinClass("Masalah", SantaiType.kError, constructError)
);
