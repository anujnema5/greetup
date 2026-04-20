import { createAuthClient } from "better-auth/react"
import { phoneNumberClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    baseURL: "http://localhost:5300",
    fetchOptions: {
        credentials: "include"
    },
    plugins: [
        phoneNumberClient()
    ]
})

export const { signIn, signOut, signUp, useSession } = authClient;
export const Session = authClient.$Infer.Session;