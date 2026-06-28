import { z } from "zod";
export const createUserSchema = z.object({
    name: z.string().min(3, { message: "Name is required" }),
    email: z.email({ message: "Invalid email address" }),
    password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});
//# sourceMappingURL=index.js.map