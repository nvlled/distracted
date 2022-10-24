import { randomElem } from "./lib";

export const FactorNumDigits = 2;

export type Proficiency = number & { readonly __brand__: unique symbol };
export type FactorIndex = number & { readonly __brand__: unique symbol };

export const Factor = {
    meaning: 0 as FactorIndex,
    sound: 1 as FactorIndex,
    text: 2 as FactorIndex,
};

export type FactorID = keyof typeof Factor;
export type FactorValues = Record<FactorID, number | null>;
export type FactorData = Record<FactorID, string | null>;

export type FactorTrial = { tested: FactorID; presented: FactorID; observation: boolean };

export type ProficiencyArg = number | FactorValues;

export const Factors = {
    create(text = 0, sound = text, meaning = text): FactorValues {
        return {
            meaning,
            sound,
            text,
        };
    },
    ids: Object.keys(Factor) as FactorID[],
    isFactorID(str: string): str is FactorID {
        return Factors.ids.includes(str as FactorID);
    },

    createEmpty(): FactorValues {
        return {
            meaning: null,
            sound: null,
            text: null,
        };
    },

    getFactorValue(proficiency: number, factor: FactorID) {
        const n = FactorNumDigits;
        const i = Factor[factor] ?? 0;
        return Math.floor(proficiency / 10 ** (i * n)) % 10 ** n;
    },
    isBalanced(proficiency: ProficiencyArg) {
        const vals = Object.values(Factors.get(proficiency));
        return vals.every((v) => vals[0] === v);
    },
    getRandom(proficiency: ProficiencyArg): FactorID {
        const ids: FactorID[] = [];
        for (const [id, value] of Object.entries(Factors.get(proficiency))) {
            if (value !== null) ids.push(id as FactorID);
        }
        return (randomElem(ids) ?? "meaning") as FactorID;
    },
    getEdgeFactor(proficiency: ProficiencyArg, type: "min" | "max" | "mid") {
        const factors = Factors.get(proficiency);
        const result: { id: FactorID; value: number } = { id: "meaning", value: 0 };

        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;
        let mid = 0;
        for (const [, value] of Object.entries(factors)) {
            if (value == null) continue;
            min = Math.min(min, value);
            max = Math.min(max, value);
            //const greater = type === "max" && result.value < value;
            //const lesser = type === "min" && result.value > value;
            //if (greater || lesser) {
            //    result = { id: factorID as FactorID, value };
            //}
        }
        for (const [, value] of Object.entries(factors)) {
            if (value == null) continue;
            if (value > min && value < max) {
                mid = value;
                break;
            }
        }

        result.value = type === "min" ? min : type === "max" ? max : mid;

        return result;
    },
    getMaxFactorValue(factors: FactorValues) {
        const values = Object.values(factors).filter((v) => v != null) as number[];
        return Math.max(...values);
    },
    getMinFactorValue(factors: FactorValues) {
        const values = Object.values(factors).filter((v) => v != null) as number[];
        return Math.min(...values);
    },

    getAverage(proficiency: ProficiencyArg) {
        const factors = Factors.get(proficiency);
        let len = 0;
        let sum = 0;
        for (const [, value] of Object.entries(factors)) {
            if (value != null) {
                sum += value;
                len++;
            }
        }
        return sum / len;
    },

    get(
        proficiency: ProficiencyArg,
        availableFactors: Set<FactorID> | undefined = undefined,
    ): FactorValues {
        if (typeof proficiency !== "number") {
            return proficiency;
        }
        const factors = Factors.createEmpty();
        for (const [key] of Object.entries(Factor)) {
            const factor = key as FactorID;
            if (!availableFactors || availableFactors.has(factor)) {
                factors[factor] = Factors.getFactorValue(proficiency, factor);
            }
        }
        return factors;
    },
    toProficiency(proficiency: ProficiencyArg): Proficiency {
        if (typeof proficiency === "number") return proficiency as Proficiency;
        const factors = proficiency;
        let result = 0;
        for (const [factor, val] of Factors.entries(factors)) {
            const i = val ?? 0;
            const n = FactorNumDigits;
            const v = Factor[factor] ?? 0;
            result += i * 10 ** (v * n);
        }
        return result as Proficiency;
    },

    entries(proficiency: ProficiencyArg): [FactorID, number | null][] {
        const factors = Factors.get(proficiency);
        const result: [FactorID, number | null][] = [];
        for (const [k, v] of Object.entries(factors)) {
            if (Factors.isFactorID(k)) {
                result.push([k, v]);
            }
        }
        return result;
    },

    getStrongestFactor(proficiency: ProficiencyArg): FactorID {
        const factors = Factors.get(proficiency);
        const max = Factors.getMaxFactorValue(factors);
        for (const [key, val] of Object.entries(factors)) {
            if (val === max) return key as FactorID;
        }
        return "meaning";
    },
    getWeakestFactor(proficiency: ProficiencyArg): FactorID {
        const factors = Factors.get(proficiency);
        const min = Factors.getMinFactorValue(factors);
        for (const [key, val] of Object.entries(factors)) {
            if (val === min) return key as FactorID;
        }
        return "meaning";
    },
    getMidFactor(proficiency: ProficiencyArg): FactorID | null {
        const factors = Factors.get(proficiency);
        const max = Factors.getMaxFactorValue(factors);
        const min = Factors.getMinFactorValue(factors);
        for (const [key, val] of Object.entries(factors)) {
            if (val !== max && val !== min) return key as FactorID;
        }
        return null;
    },
    getNeglectedFactor(proficiency: ProficiencyArg): FactorID | null {
        const strongest = Factors.getEdgeFactor(proficiency, "max");
        const weakest = Factors.getEdgeFactor(proficiency, "min");
        const mid = Factors.getEdgeFactor(proficiency, "mid");
        if (strongest.value - weakest.value > 2 && weakest.value != mid.value) {
            return weakest.id;
        }
        return null;
    },

    incrementProficiency(proficiency: ProficiencyArg, factor: FactorID, step = 1): Proficiency {
        const factors = Factors.get(proficiency);
        factors[factor] = (factors[factor] ?? 0) + step;
        return Factors.toProficiency(factors);
    },

    /*
    test: Assert.tests("Factors", () => {
        const { assert } = Assert;
        let p = Factors.get(80706);
        assert(p, { meaning: 6, sound: 7, text: 8 }, "", sameProficiency);

        assert(Factors.toProficiency(p), 80706, "");

        p = Factors.get(Factors.incrementProficiency(p, "meaning"));
        assert(p, { meaning: 7, sound: 7, text: 8 }, "", sameProficiency);

        p = Factors.get(Factors.incrementProficiency(p, "sound"));
        p = Factors.get(Factors.incrementProficiency(p, "text"));
        assert(p, { meaning: 7, sound: 8, text: 9 }, "", sameProficiency);

        {
            p = Factors.get(10109);
            let neglectedFactor = Factors.getNeglectedFactor(p);
            //console.log("neglected factor", neglectedFactor);
            //console.log(p);
            assert(neglectedFactor, "sound", "");

            p = Factors.get(10501);
            neglectedFactor = Factors.getNeglectedFactor(p);
            assert(neglectedFactor, "meaning", "");

            p = Factors.get(20707);
            neglectedFactor = Factors.getNeglectedFactor(p);
            assert(neglectedFactor, "text", "");

            assert(Factors.getNeglectedFactor(0), null, "");
        }

        {
            p = Factors.get(10203);
            assert(Factors.getMidFactor(p), "sound", "");

            p = Factors.get(90109);
            assert(Factors.getMidFactor(p), null, "");

            p = Factors.get(70102);
            assert(Factors.getMidFactor(p), "meaning", "");
        }

        // -----------------
        function sameProficiency<T extends ProficiencyArg>(p: T, q: T): boolean {
            if (typeof p === "number" || typeof q === "number") {
                return p === q;
            }
            for (const k of Object.keys(p)) {
                const id = k as FactorID;
                if (p[id] !== q[id]) return false;
            }
            return true;
        }
    }),
    */
};
