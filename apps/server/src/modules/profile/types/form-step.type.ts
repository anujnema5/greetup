import { FormField } from "./form-field.type";

export type FormStep = {
    step: number;
    title: string;
    description?: string;
    optional?: boolean;
    fields: FormField[];
};
