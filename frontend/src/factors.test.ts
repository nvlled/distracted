import { Factors } from "./factors";
import { describe, expect, test } from "@jest/globals";

describe("factors", () => {
    test("increments", () => {
        let p = Factors.get(80706);
        expect(p).toEqual({ meaning: 6, sound: 7, text: 8 });

        expect(Factors.toProficiency(p)).toEqual(80706);

        p = Factors.get(Factors.incrementProficiency(p, "meaning"));
        expect(p).toEqual({ meaning: 7, sound: 7, text: 8 });

        p = Factors.get(Factors.incrementProficiency(p, "sound"));
        p = Factors.get(Factors.incrementProficiency(p, "text"));
        expect(p).toEqual({ meaning: 7, sound: 8, text: 9 });
    });

    test("neglected factors", () => {
        let p = Factors.get(10109);
        let neglectedFactor = Factors.getNeglectedFactor(p);
        //console.log("neglected factor", neglectedFactor);
        //console.log(p);
        expect(neglectedFactor).toEqual("sound");

        p = Factors.get(10501);
        neglectedFactor = Factors.getNeglectedFactor(p);
        expect(neglectedFactor).toEqual("meaning");

        p = Factors.get(20707);
        neglectedFactor = Factors.getNeglectedFactor(p);
        expect(neglectedFactor).toEqual("text");

        expect(Factors.getNeglectedFactor(0)).toEqual(null);
    });

    test("mid factors", () => {
        let p = Factors.get(10203);
        expect(Factors.getMidFactor(p)).toEqual("sound");

        p = Factors.get(90109);
        expect(Factors.getMidFactor(p)).toEqual(null);

        p = Factors.get(70102);
        expect(Factors.getMidFactor(p)).toEqual("meaning");
    });
});
