import { createAuthClient } from "better-auth/react"
import { phoneNumberClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_SOCKET_SERVER_URL ?? "http://localhost:5300",
    fetchOptions: {
        credentials: "include"
    },
    plugins: [
        phoneNumberClient()
    ]
})

export const { signIn, signOut, signUp, useSession } = authClient;
export const Session = authClient.$Infer.Session;