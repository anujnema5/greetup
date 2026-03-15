export const isInvalidIpValue = (value: unknown): boolean => {
    if (typeof value !== "string") return true;
    const normalized = value.trim().toLowerCase();
    return normalized === "" || normalized === "undefined" || normalized === "null" || normalized === "unknown";
};

export const resolveClientIp = (socket: any): string => {
    const forwardedFor = socket.handshake?.headers?.["x-forwarded-for"];
    const realIp = socket.handshake?.headers?.["x-real-ip"];
    const directAddress = socket.handshake?.address;

    console.log(forwardedFor, realIp, directAddress);

    const forwarded = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;
    if (typeof forwarded === "string") {
        const firstForwarded = forwarded.split(",")[0].trim();
        if (!isInvalidIpValue(firstForwarded)) {
            return firstForwarded;
        }
    }
    if (!isInvalidIpValue(realIp)) {
        return String(realIp).trim();
    }
    if (!isInvalidIpValue(directAddress)) {
        return String(directAddress).trim();
    }
    return "unknown_ip";
};