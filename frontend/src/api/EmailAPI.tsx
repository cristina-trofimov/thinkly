import axiosClient from "@/lib/axiosClient";
// Make sure to import these utility functions or move them into this file

interface SendEmailParams {
    to: string;
    subject: string;
    text: string;
    sendInOneMinute?: boolean;
    sendAtLocal?: string;
}

function oneMinuteFromNowISO() {
    return new Date(Date.now() + 60_000).toISOString().replace(".000Z", "Z");
}


function localToUTCZ(dtLocal?: string) {
    if (!dtLocal) return undefined;
    const localDate = new Date(dtLocal);
    if (Number.isNaN(localDate.getTime())) {
        console.error("Invalid date string provided:", dtLocal);
        return undefined;
    }
    const utcISOString = localDate.toISOString();
    return utcISOString.replace(".000Z", "Z");
}


export async function sendEmail({
    to,
    subject,
    text,
    sendInOneMinute,
    sendAtLocal
}: SendEmailParams): Promise<void> {

    // 1. Validation & Formatting
    if (!to.trim()) return;

    const toList = to.split(",").map((s) => s.trim()).filter(Boolean);
    if (toList.length === 0) return;

    // 2. Calculate Schedule Time
    let sendAt: string | undefined;
    if (sendInOneMinute) {
        sendAt = oneMinuteFromNowISO();
    } else if (sendAtLocal) {
        sendAt = localToUTCZ(sendAtLocal);
    }

    // 3. Prepare Payload
    const payload = {
        to: toList, // Backend expects an array
        subject,
        text,
        ...(sendAt && { sendAt }),
    };

    // 4. Send via Axios
    try {
        // Ensure this matches your backend route exactly (/email/send)
        await axiosClient.post("/email/send", payload);
    } catch (error) {
        console.error("Error sending email:", error);
        throw error; // Re-throw so the UI knows it failed
    }
}