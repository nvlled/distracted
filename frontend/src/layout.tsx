import styled from "styled-components";
import { Property } from "csstype";

function entry<T>(keyName: string, value: T | undefined, defaultValue?: T | undefined) {
    if (value == undefined && defaultValue == undefined) {
        return "";
    }
    return `{${keyName}: ${value ?? defaultValue};}`;
}
function entryPx(keyName: string, value: number | undefined, defaultValue?: number | undefined) {
    if (value == undefined && defaultValue == undefined) {
        return "";
    }
    return `${keyName}: ${value ?? defaultValue}px`;
}

export namespace lt {
    export interface RowProps {
        justifyContent?: Property.JustifyContent | undefined;
        alignItems?: Property.JustifyContent | undefined;
        direction?: Property.FlexDirection | undefined;
    }
    export interface BlockProps {
        m?: number | undefined;
        mx?: number | undefined;
        my?: number | undefined;
        ml?: number | undefined;
        mr?: number | undefined;
        mt?: number | undefined;
        mb?: number | undefined;

        cm?: number | undefined;
        cmx?: number | undefined;
        cmy?: number | undefined;
        cml?: number | undefined;
        cmr?: number | undefined;
        cmt?: number | undefined;
        cmb?: number | undefined;

        p?: number | undefined;
        px?: number | undefined;
        py?: number | undefined;
        pl?: number | undefined;
        pr?: number | undefined;
        pt?: number | undefined;
        pb?: number | undefined;
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
