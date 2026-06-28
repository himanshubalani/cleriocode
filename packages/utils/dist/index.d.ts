import { z } from "zod";
export declare const createUserSchema: z.ZodObject<{
    name: z.ZodString;
    email: z.ZodEmail;
    password: z.ZodString;
}, z.core.$strip>;
export type createUserSchemaType = z.infer<typeof createUserSchema>;
//# sourceMappingURL=index.d.ts.map