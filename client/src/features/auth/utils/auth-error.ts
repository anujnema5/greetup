interface AuthError {
    code?: string;
    message?: string;
};

export function getAuthErrorMessage(error: unknown): string {
    debugger;
    if (!error) {
        return "Something went wrong. Please try again.";
    }

    if (typeof error === "string") {
        return error;
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    const authError = error as AuthError;

    switch (authError.code) {
        case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
            return "This email is already registered.";
        case "INVALID_EMAIL_OR_PASSWORD":
            return "Invalid email or password."
        case "YOU_CAN_ONLY_SEND_A_VERIFICATION_EMAIL_TO_AN_UNVERIFIED_EMAIL":
            return "You can only send a verification email to an unverified email"
        case "WEAK_PASSWORD":
            return "Password is too weak.";
        case "INVALID_EMAIL":
            return "Please enter a valid email address.";
        case "EMAIL_NOT_VERIFIED":
            return "Please verify your email first.";
        default:
            return "Something went wrong. Please try again.";
    }
}
