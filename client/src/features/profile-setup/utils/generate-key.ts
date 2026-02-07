export const generateKey = (data: any) => {
    if (data == null) return;

    if (typeof data === "string") {
        return data;
    }

    if (typeof data === "object") {
        if ("id" in data) {
            return data.id;
        }

        if ("name" in data) {
            return data.name
        }

        const keys = Object.keys(data);
        if (keys.length > 0) {
            return data[keys[0]];
        }
    }
};
