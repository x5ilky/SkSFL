// deno-lint-ignore no-explicit-any
export function match<T extends {__type: string, value: any}>(value: T, matchFor: { [k in T["__type"]]: (value: Extract<T, {__type: k}>["value"]) => void } ) {
    if (value.__type in matchFor) {
        matchFor[value.__type as T["__type"]](value.value)
    }
}
export type TsToken$Symbol = { start: number, end: number, __type: "Symbol", value: { op: string }};
export const TsToken$Symbol = (start: number, end: number, value: TsToken$Symbol["value"]): TsToken => { return { start, end, __type: "Symbol", value} };
export type TsToken$Identifier = { start: number, end: number, __type: "Identifier", value: { op: string }};
export const TsToken$Identifier = (start: number, end: number, value: TsToken$Identifier["value"]): TsToken => { return { start, end, __type: "Identifier", value} };
export type TsToken$Decorator = { start: number, end: number, __type: "Decorator", value: { op: string }};
export const TsToken$Decorator = (start: number, end: number, value: TsToken$Decorator["value"]): TsToken => { return { start, end, __type: "Decorator", value} };
export type TsToken$String = { start: number, end: number, __type: "String", value: { value: string }};
export const TsToken$String = (start: number, end: number, value: TsToken$String["value"]): TsToken => { return { start, end, __type: "String", value} };
export type TsToken$TemplateString = { start: number, end: number, __type: "TemplateString", value: { value: string, inserts: { location: number, tokens: TsToken[]}[] }};
export const TsToken$TemplateString = (start: number, end: number, value: TsToken$TemplateString["value"]): TsToken => { return { start, end, __type: "TemplateString", value} };
export type TsToken$Number = { start: number, end: number, __type: "Number", value: { num: string }};
export const TsToken$Number = (start: number, end: number, value: TsToken$Number["value"]): TsToken => { return { start, end, __type: "Number", value} };
export type TsToken$Keyword = { start: number, end: number, __type: "Keyword", value: { name: string }};
export const TsToken$Keyword = (start: number, end: number, value: TsToken$Keyword["value"]): TsToken => { return { start, end, __type: "Keyword", value} };
export type TsToken$Regexp = { start: number, end: number, __type: "Regexp", value: { value: string, modifiers: string }};
export const TsToken$Regexp = (start: number, end: number, value: TsToken$Regexp["value"]): TsToken => { return { start, end, __type: "Regexp", value} };
export type TsToken$Comment = { start: number, end: number, __type: "Comment", value: { multiline: boolean, content: string }};
export const TsToken$Comment = (start: number, end: number, value: TsToken$Comment["value"]): TsToken => { return { start, end, __type: "Comment", value} };
export type TsToken = TsToken$Symbol | TsToken$Identifier | TsToken$Decorator | TsToken$String | TsToken$TemplateString | TsToken$Number | TsToken$Keyword | TsToken$Regexp | TsToken$Comment;