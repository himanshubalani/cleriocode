import { inngest } from "../client.js";
import { prisma } from "@cleriocode/db";

export const releaseCheckWorkflow = inngest.createFunction(
  { id: "release-check", retries: 3 },
  { event: "release/check.requested" },
  async ({ event, step }) => {
    const { projectId } = event.data;

    // Step 1: Check all tasks are done
    const taskReadiness = await step.run("check-tasks", async () => {
      const featureRequests = await prisma.featureRequest.findMany({
        where: { projectId, status: "prd_ready" },
        include: {
          prd: {
            include: {
              tasks: true,
            },
          },
        },
      });

      const allTasks = featureRequests.flatMap((fr) => fr.prd?.tasks ?? []);
      const doneTasks = allTasks.filter((t) => t.status === "done");

      return {
        totalTasks: allTasks.length,
        doneTasks: doneTasks.length,
        allTasksDone: allTasks.length > 0 && doneTasks.length === allTasks.length,
      };
    });

    // Step 2: Check PR reviews have passed
    const reviewReadiness = await step.run("check-reviews", async () => {
      const repositories = await prisma.repository.findMany({
        where: { projectId },
        include: {
          pullRequests: {
            where: { status: "open" },
            include: {
              reviews: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      });

      const openPRs = repositories.flatMap((r) => r.pullRequests);
      const passedPRs = openPRs.filter(
        (pr) => pr.reviews[0]?.status === "passed"
      );

      return {
        openPRs: openPRs.length,
        passedReviews: passedPRs.length,
        allReviewsPassed:
          openPRs.length === 0 || passedPRs.length === openPRs.length,
      };
    });

    const ready = taskReadiness.allTasksDone && reviewReadiness.allReviewsPassed;

    return {
      status: "completed",
      ready,
      totalTasks: taskReadiness.totalTasks,
      doneTasks: taskReadiness.doneTasks,
      openPRs: reviewReadiness.openPRs,
      passedReviews: reviewReadiness.passedReviews,
    };
  }
);
