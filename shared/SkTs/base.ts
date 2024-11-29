// deno-lint-ignore no-explicit-any
export function match<T extends {__type: string, value: any}>(value: T, matchFor: { [k in T["__type"]]: (value: Extract<T, {__type: k}>["value"]) => void } ) {
    if (value.__type in matchFor) {
        matchFor[value.__type as T["__type"]](value.value)
    }
}
export type TsToken$Symbol = { __type: "Symbol", value: { op: string }};
export const TsToken$Symbol = (value: TsToken$Symbol["value"]): TsToken => { return {__type: "Symbol", value} };
export type TsToken$Identifier = { __type: "Identifier", value: { op: string }};
export const TsToken$Identifier = (value: TsToken$Identifier["value"]): TsToken => { return {__type: "Identifier", value} };
export type TsToken$Decorator = { __type: "Decorator", value: { op: string }};
export const TsToken$Decorator = (value: TsToken$Decorator["value"]): TsToken => { return {__type: "Decorator", value} };
export type TsToken$String = { __type: "String", value: { value: string }};
export const TsToken$String = (value: TsToken$String["value"]): TsToken => { return {__type: "String", value} };
export type TsToken$TemplateString = { __type: "TemplateString", value: { value: string, inserts: { location: number, tokens: TsToken[]}[] }};
export const TsToken$TemplateString = (value: TsToken$TemplateString["value"]): TsToken => { return {__type: "TemplateString", value} };
export type TsToken$Number = { __type: "Number", value: { num: string }};
export const TsToken$Number = (value: TsToken$Number["value"]): TsToken => { return {__type: "Number", value} };
export type TsToken$Keyword = { __type: "Keyword", value: { name: string }};
export const TsToken$Keyword = (value: TsToken$Keyword["value"]): TsToken => { return {__type: "Keyword", value} };
export type TsToken$Regexp = { __type: "Regexp", value: { value: string, modifiers: string }};
export const TsToken$Regexp = (value: TsToken$Regexp["value"]): TsToken => { return {__type: "Regexp", value} };
export type TsToken$Comment = { __type: "Comment", value: { multiline: boolean, content: string }};
export const TsToken$Comment = (value: TsToken$Comment["value"]): TsToken => { return {__type: "Comment", value} };
export type TsToken = TsToken$Symbol | TsToken$Identifier | TsToken$Decorator | TsToken$String | TsToken$TemplateString | TsToken$Number | TsToken$Keyword | TsToken$Regexp | TsToken$Comment;