import UserService from "../services/index.js";

const userController =  {
    getUsers: async () => {
        const userService = new UserService();

        const user = await userService.getUser();

        return user;
    }
}

export default userController;