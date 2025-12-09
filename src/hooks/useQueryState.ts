import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

type SetStateAction<T> = T | ((prev: T) => T);

type ParserConfig<T> = {
  parse: (value: string | null) => T;
  serialize: (value: T) => string | null;
  defaultValue: T;
};

type StringOptions = {
  defaultValue?: string;
};

function isParserConfig<T>(
  arg: ParserConfig<T> | StringOptions | undefined,
): arg is ParserConfig<T> {
  return !!arg && typeof (arg as ParserConfig<T>).parse === "function";
}

function resolveValue<T>(next: SetStateAction<T>, current: T): T {
  return typeof next === "function" ? (next as (prev: T) => T)(current) : next;
}

export function useQueryState(
  key: string,
): [
  string | null,
  (value: SetStateAction<string | null>) => void,
];
export function useQueryState(
  key: string,
  options: StringOptions,
): [
  string,
  (value: SetStateAction<string | null>) => void,
];
export function useQueryState<T>(
  key: string,
  config: ParserConfig<T>,
): [T, (value: SetStateAction<T>) => void];
export function useQueryState<T>(
  key: string,
  arg?: ParserConfig<T> | StringOptions,
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawValue = searchParams.get(key);

  let value: string | null | T;

  if (isParserConfig(arg)) {
    value = arg.parse(rawValue);
  } else if (arg?.defaultValue !== undefined) {
    value = (rawValue ?? arg.defaultValue) as string;
  } else {
    value = rawValue;
  }

  const setValue = useCallback(
    (nextValue: SetStateAction<any>) => {
      const newParams = new URLSearchParams(searchParams);
      const current = value as any;
      const resolved = resolveValue(nextValue, current);

      let serialized: string | null | undefined;
      if (isParserConfig(arg)) {
        serialized = arg.serialize(resolved as T);
      } else {
        serialized = resolved;
      }

      if (serialized === null || serialized === undefined || serialized === "") {
        newParams.delete(key);
      } else {
        newParams.set(key, serialized);
      }

      setSearchParams(newParams, { replace: true });
    },
    [arg, key, searchParams, setSearchParams, value],
  );

  return [value as any, setValue];
}

export const parseAsBoolean = {
  withDefault(defaultValue: boolean): ParserConfig<boolean> {
    return {
      defaultValue,
      parse: (value: string | null) => {
        if (value === null) return defaultValue;
        return value === "true";
      },
      serialize: (value: boolean) => (value ? "true" : "false"),
    };
  },
};

