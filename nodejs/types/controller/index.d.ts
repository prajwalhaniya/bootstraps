declare const userController: {
    getUsers: () => Promise<import("../dal/models/User.js").User | null | undefined>;
};
export default userController;
