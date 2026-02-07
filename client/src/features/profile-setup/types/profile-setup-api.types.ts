// profileSetup.types.ts

export interface ApiResponse<T = any> {
    success: boolean;
    statusCode: number;
    message: string;
    data: {
        status: number;
        data: T;
    };
    timestamp: string;
}

export interface ProfileSetupFieldBase {
    key: string;
    name: string;
    label: string;
    type: string;
    value: any;
    required?: boolean;
    placeholder?: string;
}

// Extended field types for specific input variations
export interface TextField extends ProfileSetupFieldBase {
    type: 'text' | 'textarea';
    maxLength?: number;
}

export interface NumberField extends ProfileSetupFieldBase {
    type: 'number';
    min?: number;
    max?: number;
}

export interface SelectField extends ProfileSetupFieldBase {
    type: 'select' | 'multi-select' | 'radio';
    options?: string[];
}

export interface RangeField extends ProfileSetupFieldBase {
    type: 'range';
    min: number;
    max: number;
    value: {
        min: number;
        max: number;
    };
}

export interface ToggleField extends ProfileSetupFieldBase {
    type: 'toggle';
    value: boolean;
}

export interface PhotoUploadField extends ProfileSetupFieldBase {
    type: 'photo-upload';
    max?: number;
}

// Union type for all possible field types
export type ProfileSetupField =
    | TextField
    | NumberField
    | SelectField
    | RangeField
    | ToggleField
    | PhotoUploadField;

export interface ProfileSetupStep {
    step: number;
    title: string;
    optional?: boolean;
    fields: ProfileSetupField[];
}

export interface ProfileSetupData {
    steps: ProfileSetupStep[];
    profileCompletion: number;
    isProfileComplete: boolean;
}

export type ProfileSetupApiResponse = ApiResponse<ProfileSetupData>;
