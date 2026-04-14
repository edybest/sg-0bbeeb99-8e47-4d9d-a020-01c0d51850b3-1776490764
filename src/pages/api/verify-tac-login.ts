import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

type VerifyTACRequest = {
    phone: string;
    code: string;
};

type VerifyTACResponse = {
    success: boolean;
    message?: string;
    data?: {
        access_token?: string;
        refresh_token?: string;
        user?: any;
    };
    error?: string;
    details?: any;
    debug?: any;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<VerifyTACResponse>
) {
    if (req.method !== "POST") {
        return res.status(405).json({
            success: false,
            error: "Method not allowed",
        });
    }

    try {
        const { phone, code } = req.body as VerifyTACRequest;

        if (!phone || !code) {
            return res.status(400).json({
                success: false,
                error: "Missing required fields",
            });
        }

        console.log("\n=== VERIFY TAC REQUEST ===");
        console.log("Phone:", phone);
        console.log("Code:", code);

        const phoneRegex = /^\+(60|65)\d{8,10}$/;
        let cleanPhone = phone.replace(/\D/g, "");

        if (cleanPhone.startsWith("0")) {
            cleanPhone = "6" + cleanPhone;
        } else if (!cleanPhone.startsWith("6") && cleanPhone.length > 0) {
            cleanPhone = "60" + cleanPhone;
        }

        if (cleanPhone) {
            cleanPhone = "+" + cleanPhone;
        }

        console.log("Phone (normalized):", cleanPhone);

        if (!cleanPhone || !phoneRegex.test(cleanPhone)) {
            console.log("❌ Invalid phone format");
            return res.status(400).json({
                success: false,
                error: "Format nombor telefon tidak sah. Gunakan format bermula dengan +60 atau +65.",
            });
        }

        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });

        const { data: member, error: memberError } = await supabaseAdmin
            .from("members")
            .select("id, username, full_name, is_admin, user_id, tac_code, tac_expiry")
            .eq("phone", cleanPhone)
            .maybeSingle();

        if (memberError || !member) {
            console.error("❌ Member not found");
            return res.status(404).json({
                success: false,
                error: "Member tidak dijumpai",
            });
        }

        console.log("✅ Member found:", {
            id: member.id,
            username: member.username,
            stored_tac: member.tac_code,
            provided_tac: code,
            tac_expiry: member.tac_expiry,
        });

        if (!member.tac_code || member.tac_code !== code) {
            console.log("❌ Invalid TAC code");
            return res.status(400).json({
                success: false,
                error: "Kod TAC tidak sah",
            });
        }

        if (!member.tac_expiry || new Date(member.tac_expiry) < new Date()) {
            console.log("❌ TAC expired");

            await supabaseAdmin
                .from("members")
                .update({ tac_code: null, tac_expiry: null })
                .eq("id", member.id);

            return res.status(400).json({
                success: false,
                error: "Kod TAC telah tamat tempoh",
            });
        }

        console.log("✅ TAC verified successfully");

        await supabaseAdmin
            .from("members")
            .update({ tac_code: null, tac_expiry: null })
            .eq("id", member.id);

        if (!member.user_id) {
            console.log("⚠️ Member has no linked auth user, creating one...");

            const { data: newAuthUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
                phone: cleanPhone,
                phone_confirm: true,
                user_metadata: {
                    username: member.username,
                    full_name: member.full_name,
                    member_id: member.id,
                },
            });

            if (createUserError || !newAuthUser.user) {
                console.error("❌ Failed to create auth user:", createUserError);
                return res.status(500).json({
                    success: false,
                    error: "Failed to create user account",
                });
            }

            console.log("✅ Auth user created:", newAuthUser.user.id);

            const { error: updateError } = await supabaseAdmin
                .from("members")
                .update({ user_id: newAuthUser.user.id })
                .eq("id", member.id);

            if (updateError) {
                console.error("❌ Failed to link user to member:", updateError);
                return res.status(500).json({
                    success: false,
                    error: "Failed to link user account",
                });
            }

            console.log("✅ Member linked to auth user");
            member.user_id = newAuthUser.user.id;
        }

        try {
            console.log("🔐 Generating session tokens...");
            console.log("🔐 User ID:", member.user_id);

            const tempPassword = crypto.randomUUID() + crypto.randomUUID();
            const fakeEmail = `${cleanPhone.replace("+", "")}@auth.ambc.local`;

            const { error: updateCredError } = await supabaseAdmin.auth.admin.updateUserById(
                member.user_id,
                {
                    email: fakeEmail,
                    email_confirm: true,
                    password: tempPassword,
                }
            );

            if (updateCredError) {
                console.error("❌ Failed to update user credentials:", updateCredError);
                throw new Error("Gagal menyediakan sesi log masuk");
            }

            // Try generateLink first (faster — no extra round-trip)
            const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
                type: "magiclink",
                email: fakeEmail,
            });

            if (!linkError && linkData?.properties?.hashed_token) {
                // Exchange magic link token for session
                const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
                    auth: { autoRefreshToken: false, persistSession: false },
                });

                const { data: sessionData, error: sessionError } = await supabaseClient.auth.verifyOtp({
                    token_hash: linkData.properties.hashed_token,
                    type: "magiclink",
                });

                if (!sessionError && sessionData.session) {
                    console.log("✅ Session tokens generated via magic link");

                    return res.status(200).json({
                        success: true,
                        message: "Login successful",
                        data: {
                            access_token: sessionData.session.access_token,
                            refresh_token: sessionData.session.refresh_token,
                            user: {
                                id: member.user_id,
                                username: member.username,
                                full_name: member.full_name,
                                is_admin: member.is_admin || false,
                                phone: cleanPhone,
                            },
                        },
                    });
                }

                console.warn("⚠️ Magic link verify failed, falling back to signInWithPassword:", sessionError);
            } else {
                console.warn("⚠️ generateLink failed, falling back to signInWithPassword:", linkError);
            }

            // Fallback: signInWithPassword
            const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
                auth: { autoRefreshToken: false, persistSession: false },
            });

            const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
                email: fakeEmail,
                password: tempPassword,
            });

            if (signInError || !signInData.session) {
                console.error("❌ Failed to generate session tokens");
                console.error("SIGN IN ERROR:", JSON.stringify(signInError, null, 2));

                return res.status(500).json({
                    success: false,
                    error: "Gagal menjana token sesi",
                    details: signInError || "Tiada data sesi diterima",
                    debug: {
                        hasError: !!signInError,
                        hasData: !!signInData,
                        hasSession: !!signInData?.session,
                        errorMessage: signInError?.message,
                        errorCode: signInError?.code,
                    },
                });
            }

            console.log("✅ Session tokens generated via signInWithPassword");

            return res.status(200).json({
                success: true,
                message: "Login successful",
                data: {
                    access_token: signInData.session.access_token,
                    refresh_token: signInData.session.refresh_token,
                    user: {
                        id: member.user_id,
                        username: member.username,
                        full_name: member.full_name,
                        is_admin: member.is_admin || false,
                        phone: cleanPhone,
                    },
                },
            });

        } catch (sessionError) {
            console.error("\n❌❌❌ SESSION CREATION FAILED ❌❌❌");
            console.error("Error type:", sessionError instanceof Error ? sessionError.constructor.name : typeof sessionError);
            console.error("Error message:", sessionError instanceof Error ? sessionError.message : String(sessionError));

            return res.status(500).json({
                success: false,
                error: sessionError instanceof Error ? sessionError.message : "Gagal mencipta sesi",
            });
        }

    } catch (error) {
        console.error("\n=== ERROR ===");
        console.error("Error:", error);

        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal server error",
        });
    }
}