import { User } from "../dal/models/User.js";
declare class UserService {
    getUser(): Promise<User | null | undefined>;
}
export default UserService;
