import { NextResponse } from "next/server";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const email = String(body.email || "").trim().toLowerCase();

        if (!email) {
            return NextResponse.json(
                { success: false, message: "Email is required." },
                { status: 400 },
            );
        }

        if (!emailRegex.test(email)) {
            return NextResponse.json(
                { success: false, message: "Please enter a valid email address." },
                { status: 400 },
            );
        }

        // TODO: Connect backend/database here.
        // Example: save email in SQL table newsletter_subscribers.

        return NextResponse.json({
            success: true,
            message: "Subscribed successfully!",
        });
    } catch {
        return NextResponse.json(
            { success: false, message: "Unable to subscribe right now." },
            { status: 500 },
        );
    }
}