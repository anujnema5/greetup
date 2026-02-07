import { UserEventListeners } from "@/modules/user/events";

export const registerEventListeners = () => {
    new UserEventListeners();
}
