import { UserEventListeners } from "@/modules/user/events";

let isRegistered = false;

export const registerEventListeners = () => {
    if (isRegistered) return;
    new UserEventListeners();
    isRegistered = true;
}
