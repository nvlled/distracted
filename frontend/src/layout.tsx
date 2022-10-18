import styled from "styled-components";
import { Property } from "csstype";

function entry<T>(keyName: string, value: T | undefined, defaultValue?: T | undefined) {
    if (value == undefined && defaultValue == undefined) {
        return "";
    }
    return `{${keyName}: ${value ?? defaultValue};}`;
}
function entryPx(
    keyName: string,
    value: string | number | undefined,
    defaultValue?: string | number | undefined,
) {
    if (value == undefined && defaultValue == undefined) {
        return "";
    }
    const v = value ?? defaultValue;
    return `${keyName}: ${typeof v === "number" ? `${v}x` : v}`;
}

export namespace lt {
    export interface RowProps {
        justifyContent?: Property.JustifyContent | undefined;
        alignItems?: Property.JustifyContent | undefined;
        direction?: Property.FlexDirection | undefined;
    }
    export interface BlockProps {
        m?: string | number | undefined;
        mx?: string | number | undefined;
        my?: string | number | undefined;
        ml?: string | number | undefined;
        mr?: string | number | undefined;
        mt?: string | number | undefined;
        mb?: string | number | undefined;

        cm?: string | number | undefined;
        cmx?: string | number | undefined;
        cmy?: string | number | undefined;
        cml?: string | number | undefined;
        cmr?: string | number | undefined;
        cmt?: string | number | undefined;
        cmb?: string | number | undefined;

        p?: string | number | undefined;
        px?: string | number | undefined;
        py?: string | number | undefined;
        pl?: string | number | undefined;
        pr?: string | number | undefined;
        pt?: string | number | undefined;
        pb?: string | number | undefined;
    }
}
export const lt = {
    Block: styled.div<lt.BlockProps>`
        ${(props) => entryPx("margin", props.m)}
        ${(props) => entryPx("margin-left", props.ml ?? props.mx)}
        ${(props) => entryPx("margin-right", props.mr ?? props.mx)}
        ${(props) => entryPx("margin-bottom", props.mb ?? props.my)}
        ${(props) => entryPx("margin-top", props.mt ?? props.my)}

        ${(props) => entryPx("padding", props.p)}
        ${(props) => entryPx("padding-left", props.pl ?? props.px)}
        ${(props) => entryPx("padding-right", props.pr ?? props.px)}
        ${(props) => entryPx("padding-bottom", props.pb ?? props.py)}
        ${(props) => entryPx("padding-top", props.pt ?? props.py)}
    `,
    Row: styled.div<lt.RowProps & lt.BlockProps>`
        display: flex;
        justify-content: ${(props) => props.justifyContent ?? "left"};
        align-items: ${(props) => props.alignItems ?? "center"};
        flex-direction: ${(props) => props.direction ?? "row"};

        > * {
            ${(props) => entryPx("margin", props.cm)};
            ${(props) => entryPx("margin-left", props.cml ?? props.cmx)};
            ${(props) => entryPx("margin-right", props.cmr ?? props.cmx)};
            ${(props) => entryPx("margin-bottom", props.cmb ?? props.cmy)};
            ${(props) => entryPx("margin-top", props.cmt ?? props.cmy)};
        }

        ${(props) => entryPx("margin", props.m)};
        ${(props) => entryPx("margin-left", props.ml ?? props.mx)};
        ${(props) => entryPx("margin-right", props.mr ?? props.mx)};
        ${(props) => entryPx("margin-bottom", props.mb ?? props.my)};
        ${(props) => entryPx("margin-top", props.mt ?? props.my)};

        ${(props) => entryPx("padding", props.p)};
        ${(props) => entryPx("padding-left", props.pl ?? props.px)};
        ${(props) => entryPx("padding-right", props.pr ?? props.px)};
        ${(props) => entryPx("padding-bottom", props.pb ?? props.py)};
        ${(props) => entryPx("padding-top", props.pt ?? props.py)};
    `,
    test: styled.div({
        alignItems: "center",
    }),
};

export const Flex = styled.div<lt.RowProps & lt.BlockProps>`
    display: flex;
    justify-content: ${(props) => props.justifyContent ?? "left"};
    align-items: ${(props) => props.alignItems ?? "center"};
    flex-direction: ${(props) => props.direction ?? "row"};

    > * {
        ${(props) => entryPx("margin", props.cm)};
        ${(props) => entryPx("margin-left", props.cml ?? props.cmx)};
        ${(props) => entryPx("margin-right", props.cmr ?? props.cmx)};
        ${(props) => entryPx("margin-bottom", props.cmb ?? props.cmy)};
        ${(props) => entryPx("margin-top", props.cmt ?? props.cmy)};
    }

    ${(props) => entryPx("margin", props.m)};
    ${(props) => entryPx("margin-left", props.ml ?? props.mx)};
    ${(props) => entryPx("margin-right", props.mr ?? props.mx)};
    ${(props) => entryPx("margin-bottom", props.mb ?? props.my)};
    ${(props) => entryPx("margin-top", props.mt ?? props.my)};

    ${(props) => entryPx("padding", props.p)};
    ${(props) => entryPx("padding-left", props.pl ?? props.px)};
    ${(props) => entryPx("padding-right", props.pr ?? props.px)};
    ${(props) => entryPx("padding-bottom", props.pb ?? props.py)};
    ${(props) => entryPx("padding-top", props.pt ?? props.py)};
`;

export const Block = styled.div<lt.BlockProps>`
    display: block;
    > * {
        ${(props) => entryPx("margin", props.cm)};
        ${(props) => entryPx("margin-left", props.cml ?? props.cmx)};
        ${(props) => entryPx("margin-right", props.cmr ?? props.cmx)};
        ${(props) => entryPx("margin-bottom", props.cmb ?? props.cmy)};
        ${(props) => entryPx("margin-top", props.cmt ?? props.cmy)};
    }

    ${(props) => entryPx("margin", props.m)};
    ${(props) => entryPx("margin-left", props.ml ?? props.mx)};
    ${(props) => entryPx("margin-right", props.mr ?? props.mx)};
    ${(props) => entryPx("margin-bottom", props.mb ?? props.my)};
    ${(props) => entryPx("margin-top", props.mt ?? props.my)};

    ${(props) => entryPx("padding", props.p)};
    ${(props) => entryPx("padding-left", props.pl ?? props.px)};
    ${(props) => entryPx("padding-right", props.pr ?? props.px)};
    ${(props) => entryPx("padding-bottom", props.pb ?? props.py)};
    ${(props) => entryPx("padding-top", props.pt ?? props.py)};
`;
