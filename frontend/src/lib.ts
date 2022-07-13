export type MainPages = "intro" | "drill" | "prepare";

export type Action = () => void;
export type Action1<A> = (a: A) => void;
export type Action2<A, B> = (a: A, b: B) => void;
export type Action3<A, B, C> = (a: A, b: B, c: C) => void;
export type Action4<A, B, C, D> = (a: A, b: B, c: C, d: D) => void;

export async function handleError<T>(
    promise: Promise<T | Error>,
): Promise<[T, undefined] | [undefined, Error]> {
    try {
        return [(await promise) as T, undefined];
    } catch (e) {
        if (typeof e === "string") {
            return [undefined, new Error(e)];
        }
        if (e instanceof Error) {
            return [undefined, e];
        }
        console.log(typeof e);
    }
    throw new Error("should not happen");
}

export function Invoke(fn: () => void) {
    fn();
}

//export function isRelativePath(path: string): boolean {
//    if (path.match(/^((HTTPS?)|(FTP)):/)) {
//        return false;
//    }
//
//    return path.slice(0, 1) != "/";
//}
