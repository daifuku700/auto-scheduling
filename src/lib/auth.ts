import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: "select_account",
                    access_type: "offline",
                    include_granted_scopes: "true",
                    scope: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks",
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }) {
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token;
                token.expiresAt = account.expires_at;
            }
            return token;
        },
        async session({ session, token }) {
            session.accessToken = token.accessToken as string | undefined;
            return session;
        },
    },
    pages: {
        signIn: "/",
    },
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24時間
    },
    events: {
        async signOut({ session, token }) {
            console.log("User has been signed out");
        },
    },
};
