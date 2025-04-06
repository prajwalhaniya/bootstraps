import { User } from "../dal/models/User.js";
import { AppDataSource } from "../dal/dataSource.js";

class UserService {
    async getUser() {
        try {
            const userModel = AppDataSource.getRepository(User);
            const user = await userModel.findOneBy({
                id: 1
            });
        
            console.log({ user });

            return user;
        } catch (error) {
            console.log(error);
        }
    }
}

export default UserService;