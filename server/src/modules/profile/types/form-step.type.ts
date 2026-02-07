import { FormField } from "./form-field.type";

export type FormStep = {
    step: number;
    title: string;
    optional?: boolean;
    fields: FormField[];
};
