import { inngest } from "../client.js";
import { generatePRD } from "@cleriocode/ai";
import { prisma } from "@cleriocode/db";

export const prdGenerationWorkflow = inngest.createFunction(
  { id: "prd-generation", retries: 3 },
  { event: "prd/generation.requested" },
  async ({ event, step }) => {
    const { featureRequestId } = event.data;

    // Step 1: Fetch the feature request
    const featureRequest = await step.run("fetch-feature-request", async () => {
      const fr = await prisma.featureRequest.findUniqueOrThrow({
        where: { id: featureRequestId },
        select: { id: true, title: true, description: true, projectId: true },
      });
      return fr;
    });

    // Step 2: Update feature request status to generating
    await step.run("mark-generating", async () => {
      await prisma.featureRequest.update({
        where: { id: featureRequestId },
        data: { status: "prd_generating" },
      });
    });

    // Step 3: Generate PRD using AI
    const prdContent = await step.run("generate-prd", async () => {
      return generatePRD({
        title: featureRequest.title,
        description: featureRequest.description,
      });
    });

    // Step 4: Persist the PRD and update feature request status
    await step.run("persist-prd", async () => {
      await prisma.pRD.create({
        data: {
          content: JSON.parse(JSON.stringify(prdContent)),
          status: "draft",
          featureRequestId,
        },
      });

      await prisma.featureRequest.update({
        where: { id: featureRequestId },
        data: { status: "prd_ready" },
      });
    });

    return { status: "completed", featureRequestId };
  }
);
