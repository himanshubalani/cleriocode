import express from "express"
import { createUserSchema } from "@cleriocode/utils";
import cors from 'cors';
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "@cleriocode/trpc";

// import { createUserSchema } from "@cleriocode/utils";

const app = express();
app.use(express.json());
app.use(cors());

app.use("/trpc",
	createExpressMiddleware({
	router: appRouter,
})
);

// app.get("/", (req, res) => {
// 	return res.json({
// 		message: "Hello Spiderman",
// });
// });

// app.post("/users", (req, res) => {
// 	const result = createUserSchema.safeParse(req.body);

// 	if (!result.success) {
// 		const message = result.error.issues
// 		.map((issue) => issue.message)
// 		.join(",");

// 		return res.status(400).json({
// 			success: false,
// 			message: "Invalid input",
// 		});
// 	}

// 	console.log(result.data);

// 	return res.json({
// 		success: true,
// 		message: "User created",
// 	})
// })

const PORT = 5000
app.listen(PORT, () => {
	console.log(`Server runnng at port: ${PORT}`);
})